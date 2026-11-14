const map = [
  5, 4, 6, 3, 7, 2, 17, 1, 8,
  0, 9, 16, 10, 15, 11, 14, 12, 13,

  7, 6, 17, 5, 8, 4, 9, 3, 10,
  2, 11, 1, 12, 0, 13, 16, 14, 15,

  0, 16, 1, 15, 2, 14, 3, 13, 4,
  12, 5, 11, 6, 10, 7, 9, 17, 8,

  17, 7, 8, 6, 9, 5, 10, 4, 11,
  3, 12, 2, 13, 1, 14, 0, 15, 16,

  6, 13, 7, 4, 17, 3, 8, 2, 9,
  1, 10, 0, 11, 16, 12, 15, 5, 14,

  4, 2, 13, 1, 5, 0, 6, 16, 7,
  15, 17, 14, 8, 3, 9, 12, 10, 11,

  1, 0, 2, 16, 3, 15, 4, 14, 5,
  13, 6, 12, 7, 11, 17, 10, 8, 9,

  8, 17, 14, 7, 10, 13, 11, 5, 12,
  9, 16, 3, 15, 2, 6, 1, 4, 0,

  2, 1, 3, 0, 4, 16, 13, 15, 6,
  14, 7, 5, 17, 12, 8, 11, 9, 10,

  4, 3, 5, 2, 6, 1, 7, 17, 0,
  16, 8, 15, 9, 14, 10, 13, 11, 12
];

const map2 = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', '[', ']', '-'
];

let lastSymbol = 0;
let decoded = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let prev;

function clearPrev() {
  prev = Array(5).fill(0).map((_,i1) => Array(12).fill(0).map((_, i2)=>(i1+i2)%16));
}
clearPrev();

// Generate a non-colliding positional number "alphabet" using an input base and already used digits.
function genA(base=10, used='') {
  let j = 0;
  let out = [];
  for(let i = 0; i < base; i++) {
    while(used.includes(j.toString(36))) j++;
    if (j >= 36) throw new RangeError("Went above 36 in genA "+base+','+used);
    out.push(j.toString(36));
    j++;
  }
  return out;
}

// Encode a non-colliding positional number using the base of the LSD
function posNCE(input, ibase, length = null) {
  ibase = Math.abs(ibase) | 0;
  let base = ibase;
  if (base < 2) throw new RangeError("base must at least be 2");
  if (length!=null && length > 37 - ibase) throw new RangeError("Too long!");
  let int = input;
  let int2 = [];
  while (int > 0) {
    int2.push([int % base,base]);
    int = Math.floor(int / base);
    if (int2.length > 37 - ibase) throw new RangeError("Hit length limit!");
    base++;
  }
  if (length !== null) {
    while (int2.length < length) {
      int2.push([0, base]);
      base++;
    }
  } else if (input == 0) int2.push([0, base]);
  let output = '';
  while (int2.length > 0) {
    const v = int2.pop();
    const o = genA(v[1], output)[v[0]];
    if(o==undefined) throw new RangeError("No digit options "+input+','+base+','+length);
    output += o;
  }
  return output;
}

function posNCD(input, ibase) {
  let base = ibase;
  base = Math.abs(base) | 0;
  input = input.toLowerCase();
  let output = 0;
  let mul = 1;
  for (let i = input.length-1; i >= 0; i--) {
    const idx = genA(base, input.slice(0, i)).indexOf(input[i]);
    if (idx==-1) return NaN;
    output += idx * mul;
    mul *= base;
    base++;
  }
  return output;
}

async function main() {
  /** @type HTMLCanvasElement */
  const eFFT = document.getElementById('fft');
  const ctx = eFFT.getContext('2d');
  /** @type HTMLInputElement */
  const eTVToggle = document.getElementById('tvtoggle');
  /** @type HTMLDialogElement */
  const eHelp = document.getElementById('help');
  const eStart = document.getElementById('start');
  const eSync = document.getElementById('sync');
  const eIDSpot = document.getElementById('idspot');
  const eTimeIndex = document.getElementById('timeindex');
  const eDecoder = document.getElementById('decoder');
  const eDecoded = document.getElementById('decoded');
  const eHistory = document.getElementById('history');
  const eCopy = document.getElementById('copyid');
  let row = 0;
  let timer = 0;
  let tick = 0;
  let tick2 = 0;
  let syncCounter = 0, hasSync = false;
  let lastFullMajorityDecode = null;
  let lastHeight = 0;

  eCopy.addEventListener('click', function () {
    if (lastFullMajorityDecode == null) return;
    try {
      navigator.clipboard.writeText(lastFullMajorityDecode.slice(0, 3) + lastFullMajorityDecode.slice(4, 7));
      eCopy.innerText = "Copied!";
    } catch (e) {
      console.error('e');
      eCopy.innerText = "Failed to copy!";
    } finally {
      setTimeout(function () {
        eCopy.innerText = "Copy ID";
      }, 2000);
    }
  });

  function addRow(text) {
    const li = document.createElement('li');
    const liO = document.createElement('output');
    liO.innerText = text;
    li.appendChild(liO);
    eHistory.prepend(li);
    while (eHistory.children.length > 10) {
      eHistory.removeChild(eHistory.children.item(eHistory.children.length - 1));
    }
  }
  eStart.addEventListener('click', function () {
    eHelp.close();
  });
  document.getElementById('showhelp').addEventListener('click', function () {
    eHelp.show();
  });
  eHelp.show();
  eHelp.addEventListener('close', async function () {
    eStart.innerText = "Close";
    const audioContext = new AudioContext({
      sampleRate: 12000,
    });
    // When packing, use these:
    // try {
    //   const workletBlob = new Blob([document.getElementById('processor-code').textContent]);
    //   await audioContext.audioWorklet.addModule(URL.createObjectURL(workletBlob));
    // } catch (e) {
    //   console.error(e);
    //   alert("Failed to load worklet. The packed version doesn't work on Chromium, only Firefox");
    //   return;
    // }
    await audioContext.audioWorklet.addModule("./audio.js");
    const processor = new AudioWorkletNode(
      audioContext,
      "audioProcessor",
    );
    const micStream = await navigator.mediaDevices.getUserMedia({
  		audio: {
  			echoCancellation: false,
  			noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 12000
  		},
  		video: false
    });
    const micNode = audioContext.createMediaStreamSource(micStream);
    micNode.connect(processor);
    processor.port.addEventListener('message', function (e) {
      if (lastHeight !== eFFT.clientHeight) {
        lastHeight = eFFT.clientHeight;
        eFFT.height = Math.max(1,eFFT.clientHeight/2);
        row = 0;
      }
      const imagedata = ctx.getImageData(0, row, eFFT.width, 1);
      let patterns = Array(18).fill(0);
      for (let carrier = 0; carrier < 10; carrier++) {
        let max = Math.max(...e.data.slice(carrier * 18, carrier * 18 + 18));
        let min = Math.min(...e.data.slice(carrier * 18, carrier * 18 + 18));
        const m = 1 / (max - min);
        for (let options = 0; options < 18; options++) {
          const o = (e.data[carrier * 18 + options] - min) * m;
          const o2 = Math.max(0, 1 - (1 - o) * 2);
          e.data[carrier * 18 + options] = o;
          patterns[map[carrier * 18 + options]] += e.data[carrier * 18 + options];
          const i = (carrier * 21 + options) * 8;
          imagedata.data[i] = o2*o2*o2 * 255;
          imagedata.data[i + 1] = o2*o2 * 255;
          imagedata.data[i + 2] = o2 * 255;
          imagedata.data[i + 3] = 255;
          if (options < 17) {
            imagedata.data[i + 4] = 0;
            imagedata.data[i + 5] = 0;
            imagedata.data[i + 6] = 0;
            imagedata.data[i + 7] = 255;
          }
        }
      }
      let pmax = Math.max(...patterns);
      let pmin = Math.min(...patterns);
      const pm = 1 / (pmax - pmin);
      for (let pattern = 0; pattern < 18; pattern++) {
        const o = Math.max(0, 1 - (1 - (patterns[pattern] - pmin) * pm) * 1.1);
        const i = (212 + pattern) * 8;
        imagedata.data[i] = 255 - o*o*o * 255;
        imagedata.data[i + 1] = 255 - o*o * 255;
        imagedata.data[i + 2] = 255 - o * 255;
        imagedata.data[i + 3] = 255;
        if (pattern < 17) {
          imagedata.data[i + 4] = 255;
          imagedata.data[i + 5] = 255;
          imagedata.data[i + 6] = 255;
          imagedata.data[i + 7] = 255;
        }
      }
      ctx.putImageData(imagedata, 0, row);
      let symbol = patterns.indexOf(pmax);
      if (symbol < 0) symbol = 0;
      if (timer < 1) {
        let avoidPreSyncPrint = false;
        if (symbol === 16) {
          if (tick === 3) syncCounter++;
          tick2 = 0;
        }
        else if (symbol == 17) {
          if (tick2 == 8) {
            if (tick < 10 || !hasSync) {
              if (lastFullMajorityDecode == null) eSync.classList.add('on');
              clearPrev();
              while (eHistory.children.length > 0) {
                eHistory.removeChild(eHistory.children.item(eHistory.children.length - 1));
              }
              addRow('( Got sync )', map);
              row++;
              avoidPreSyncPrint = true;
            }
            tick = 11;
            syncCounter = 4;
            hasSync = true;
          } else if (tick > 10) syncCounter++;
        }
        decoded[tick] = symbol;
        if (tick > 10) {
          if(!avoidPreSyncPrint) {
            prev.pop();
            prev.unshift(decoded.slice());
            addRow(decoded.map(x => map2[x]).join(''));
          }
          if (--syncCounter <= 0 && hasSync) {
            hasSync = false;
            if(lastFullMajorityDecode==null) eSync.classList.remove('on');
            addRow('( Lost sync )', map);
          }
        }
        let rawHTML = '';
        let rawText = '';
        let majorityHTML = '';
        let majorityText = '';
        // let majoritySymbols = 0;
        for (let i1 = 0; i1 < 12; i1++) {
          let patterns = Array(18).fill(0);
          for (let i2 = 0; i2 < 5; i2++) {
            patterns[prev[i2][i1]]++;
          }
          const cur = i1 == (tick + 1) % 12 ? 'b' : 'span';
          let pmax = Math.max(...patterns);
          if (pmax < 3) {
            rawText += map2[decoded[i1]];
            rawHTML += `<${cur} class="r">${map2[decoded[i1]]}</${cur}>`;
            majorityText += map2[decoded[i1]];
            majorityHTML += '<span class="gr">?</span>';
          } else {
            // if (i1 != 3 && i1 != 11) majoritySymbols++;
            rawText += map2[decoded[i1]];
            rawHTML += `<${cur} class="${decoded[i1] == patterns.indexOf(pmax) ? "g" : "y"}">${map2[decoded[i1]]}</${cur}>`;
            majorityText += map2[patterns.indexOf(pmax)];
            majorityHTML += `<b class="g">${map2[patterns.indexOf(pmax)]}</b>`;
          }
          if (tick > 10) {
            const firsthalf = posNCD(rawText.slice(0, 3), 14);
            if (firsthalf != NaN) {
              const shift0 = parseInt(rawText[4], 16) - parseInt(rawText[0], 16) & 15;
              const shift1 = parseInt(rawText[5], 16) - parseInt(rawText[1], 16) & 15;
              const shift2 = parseInt(rawText[6], 16) - parseInt(rawText[2], 16) & 15;
              if (shift0 === shift1 && shift1 === shift2 && shift2 !== 0) {
                eIDSpot.innerText = `${firsthalf}${['N', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][shift0] ?? 'U'} (${rawText.slice(0, 3)}${rawText.slice(4, 7)})`;
                eTimeIndex.innerText = posNCD(rawText.slice(7, 11), 13);
              }
            }
            eDecoded.innerHTML = majorityHTML;
          }
        }
        eDecoder.innerHTML = rawHTML;
        row++
        if (tick > 10&&hasSync) row++;
        row = row % eFFT.height;
        tick = (tick + 1) % 12;
        tick2++;
      }
      if (lastSymbol !== symbol) {
        timer = (timer - 4) * 0.9 + 4;
      }
      timer = (timer + 1) % 8;
      lastSymbol = symbol;
    });
    eTVToggle.addEventListener('change', function () {
      // processor.port.postMessage({ 'tvToggle': eTVToggle.checked });
      processor.port.postMessage({ 'tvToggle': +eTVToggle.value });
    });
    processor.port.start();
    processor.connect(audioContext.destination);
    audioContext.resume();
  }, { once: true });

}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else main();
