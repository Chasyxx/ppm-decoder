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
function genA(base=10, used='', min=0) {
  let j = 0;
  let out = [];
  for(let i = 0; i < base; i++) {
        while(used.includes(j.toString(36))) j++;
    if(i>=min) out.push(j.toString(36));
    j++;
  }
  return out;
}

// Encode a non-colliding positional number.
function posNCE(input, base) {
  let output = '';
  const length = input<1?1:Math.floor(Math.log(input) / Math.log(base))+1;
  for (let i = 0; i < length; i++) {
    const v = input / base**(length-1-i)%base|0;
    output += genA(base, output, v)[0];
    // input = input / base | 0;
  }
  return output;
}

function posNCD(input, base) {
  input = input.toLowerCase();
  let output = 0;
  for (let i = 0; i < input.length; i++) {
    const idx = genA(base, input.slice(0, i), 0).indexOf(input[i]);
    if (idx==-1) throw new TypeError('String does not represent an NCPN');
    output = output * base + idx;
  }
  return output;
}

async function main() {
  // const eFFTContainer = document.getElementById('fft-container');
  /** @type HTMLCanvasElement */
  const eFFT = document.getElementById('fft');
  const ctx = eFFT.getContext('2d');
  /** @type HTMLSelectElement */
  // const ePreference = document.getElementById('preference');
  /** @type HTMLInputElement */
  const eTVToggle = document.getElementById('tvtoggle');
  /** @type HTMLDialogElement */
  const eHelp = document.getElementById('help');
  const eStart = document.getElementById('start');
  const eStatus = document.getElementById('status');
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
    //   eStatus.innerText = "Failed to load worklet. The packed version doesn't work on Chromium, only Firefox";
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
        eFFT.height = eFFT.clientHeight/2;
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
          const o2 = Math.max(0, 1 - (1 - o) * 1.5);
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
        const o = Math.max(0, 1 - (1 - (patterns[pattern] - pmin) * pm) * 1.5);
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
      if (timer < 1) {
        row++
        if (tick == 11&&hasSync) row++;
        row = row % eFFT.height;
      }
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
              if (lastFullMajorityDecode == null) eStatus.innerText = "Got sync...";
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
          } else if (tick === 11) syncCounter++;
        }
        decoded[tick] = symbol;
        if (tick >= 11) {
          if(!avoidPreSyncPrint) {
            prev.pop();
            prev.unshift(decoded.slice());
            addRow(decoded.map(x => map2[x]).join(''));
          }
          if (--syncCounter <= 0 && hasSync) {
            hasSync = false;
            if(lastFullMajorityDecode==null) eStatus.innerText = "Lost sync...";
            addRow('( Lost sync )', map);
          }
        }
        let rawHTML = '';
        let majorityHTML = '';
        let majorityText = '';
        let majoritySymbols = 0;
        for (let i1 = 0; i1 < 12; i1++) {
          let patterns = Array(18).fill(0);
          for (let i2 = 0; i2 < 5; i2++) {
            patterns[prev[i2][i1]]++;
          }
          const cur = i1 == (tick+1)%12 ? 'b' : 'span';
          let pmax = Math.max(...patterns);
          if (pmax < 3) {
            rawHTML += `<${cur} class="r">${map2[decoded[i1]]}</${cur}>`;
            majorityText += map2[decoded[i1]];
            majorityHTML += '<b class="r">?</b>';
          } else {
            if (i1 != 3 && i1 != 11) majoritySymbols++;
            rawHTML += `<${cur} class="${decoded[i1]==patterns.indexOf(pmax)?"g":"y"}">${map2[decoded[i1]]}</${cur}>`;
            majorityText += map2[patterns.indexOf(pmax)];
            majorityHTML += `<b class="g">${map2[patterns.indexOf(pmax)]}</b>`;
          }
          if (majoritySymbols >= 10 && hasSync &&tick==11) {
            lastFullMajorityDecode = majorityText;
            let timeIndex = 'invalid';
            try {
              timeIndex = posNCD(majorityText.slice(7, 11), 13);
            } catch (e) { console.warning(e); }
            const h = `<span class="${timeIndex=='invalid'?'y':'g'}">ID ${majorityText.slice(0, 3) + majorityText.slice(4, 7)}<br>Time index ${timeIndex}</span>`;
            if(eStatus.innerHTML!==h) eStatus.innerHTML = h;
            eCopy.disabled = false; // show button
          }
        }
        eDecoder.innerHTML = rawHTML;
        eDecoded.innerHTML = majorityHTML;
        tick = (tick + 1) % 12;
        tick2++;
      }
      if (lastSymbol !== symbol) {
        timer = (timer - 4) * 0.9 + 4;
      }
      timer = (timer + 1) % 8;
      lastSymbol = symbol;
      // console.log(map2[]);
    });
    eTVToggle.addEventListener('change', function () {
      // processor.port.postMessage({ 'tvToggle': eTVToggle.checked });
      processor.port.postMessage({ 'tvToggle': +eTVToggle.value });
    });
    processor.port.start();
    // const osc = audioContext.createOscillator();
    // osc.type = 'sine';
    // osc.frequency.setValueAtTime(1000, audioContext.currentTime);
    // osc.connect(processor);
    // osc.start();
    processor.connect(audioContext.destination);
    eStatus.innerText = "Looking for sync...";
    audioContext.resume();
  }, { once: true });

}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else main();
