const freqs = [
  1000.2, 1004.1, 1008.0, 1011.9, 1015.8, 1019.7, 1023.6, 1027.5, 1031.4,
  1035.3, 1039.2, 1043.1, 1047.0, 1050.9, 1054.8, 1058.7, 1062.6, 1066.5,

  1191.6, 1195.5, 1199.4, 1203.3, 1207.2, 1211.1, 1215.0, 1218.9, 1222.8,
  1226.7, 1230.6, 1234.5, 1238.4, 1242.3, 1246.2, 1250.1, 1254.0, 1257.9,

  1382.8, 1386.7, 1390.6, 1394.5, 1398.4, 1402.3, 1406.2, 1410.1, 1414.0,
  1417.9, 1421.8, 1425.7, 1429.6, 1433.5, 1437.4, 1441.3, 1445.2, 1449.1,

  1574.4, 1578.3, 1582.2, 1586.1, 1590.0, 1593.9, 1597.8, 1601.7, 1605.6,
  1609.5, 1613.4, 1617.3, 1621.2, 1625.1, 1629.0, 1632.9, 1636.8, 1640.7,

  1765.8, 1769.7, 1773.6, 1777.5, 1781.4, 1785.3, 1789.2, 1793.1, 1797.0,
  1800.9, 1804.8, 1808.7, 1812.6, 1816.5, 1820.4, 1824.3, 1828.2, 1832.1,

  1957.2, 1961.1, 1965.0, 1968.9, 1972.8, 1976.7, 1980.6, 1984.5, 1988.4,
  1992.3, 1996.2, 2000.1, 2004.0, 2007.9, 2011.8, 2015.7, 2019.6, 2023.5,

  2160.2, 2164.1, 2168.0, 2171.9, 2175.8, 2179.7, 2183.6, 2187.5, 2191.4,
  2195.3, 2199.2, 2203.1, 2207.0, 2210.9, 2214.8, 2218.7, 2222.6, 2226.5,

  2375.1, 2379.0, 2382.9, 2386.8, 2390.7, 2394.6, 2398.5, 2402.4, 2406.3,
  2410.2, 2414.1, 2418.0, 2421.9, 2425.8, 2429.7, 2433.6, 2437.5, 2441.4,

  2593.9, 2597.8, 2601.7, 2605.6, 2609.5, 2613.4, 2617.3, 2621.2, 2625.1,
  2629.0, 2632.9, 2636.8, 2640.7, 2644.6, 2648.5, 2652.4, 2656.3, 2660.2,

  2816.5, 2820.4, 2824.3, 2828.2, 2832.1, 2836.0, 2839.9, 2843.8, 2847.7,
  2851.6, 2855.5, 2859.4, 2863.3, 2867.2, 2871.1, 2875.0, 2878.9, 2882.8
]

function FFTC(I,O,le,m=-1,os=0,is=0,s=1){
    if (le<2) return O[os] = I[is];
    FFTC(I,O,le/2,m,os,is,s*2);
    FFTC(I,O,le/2,m,os+le/2,is+s,s*2);
    for(let k = 0; k < le/2; k++) {
        const p = O[os+k];
        const t = k/le*Math.PI*2*m;
        const q1 = O[os+k+le/2];
        const q = [q1[0]*Math.cos(t)-q1[1]*Math.sin(t),q1[0]*Math.sin(t)+q1[1]*Math.cos(t)];
        O[os+k] = [p[0]+q[0],p[1]+q[1]];
        O[os+k+le/2] = [p[0]-q[0],p[1]-q[1]];
    }
}

class goertzelProc extends AudioWorkletProcessor {
  constructor(...a) {
    super(...a);
    this.inBuf = Array(this.bufLen = 4096).fill(0);
    this.fftIn = Array(this.bufLen).fill(0).map(x=>[0,0]);
    this.fftOut = Array(this.bufLen);
    this.preHann = Array(this.bufLen).fill(0).map((_,i)=>Math.sin(i/this.bufLen*Math.PI)**2);
    this.bufIdx = 0;
    this.timer = 0;
    this.tvToggle = 0;

    this.port.addEventListener('message', (/** @type MessageEvent */e)=>{
      // console.log(e.data,e.data.hasOwnProperty('tvToggle'),e.data.tvToggle);
      if (e.data.hasOwnProperty('tvToggle')) {
        this.tvToggle = e.data.tvToggle;
      }
    });
    this.port.start();
  }
  process(inputs, outputs, _parameters) {
    const input = (inputs[0] ?? [])[0] ?? null;
    if (input == null) return true;
    for (let i1 = 0; i1 < input.length; i1++) {
      this.inBuf[this.bufIdx] = input[i1];
      // for (let ch = 0; ch < outputs[0].length; ch++) outputs[0][ch][i1] = input[i1];
      this.bufIdx = (this.bufIdx + 1) % this.bufLen;
      this.timer++;
      if (this.timer >= 600) {

        this.timer = 0;
        for (let i2 = 0; i2 < this.bufLen; i2++) {
          this.fftIn[i2][0] = this.inBuf[(i2 + this.bufIdx) % this.bufLen] * this.preHann[i2];
        }
        FFTC(this.fftIn, this.fftOut, this.bufLen);
        const bins = freqs.map(hz => {
          if(this.tvToggle) hz += this.tvToggle;
          const FFTIndex = Math.round(hz / 12000 * this.bufLen);
          return Math.sqrt(this.fftOut[FFTIndex][0] ** 2 + this.fftOut[FFTIndex][1] ** 2);
        });
        this.port.postMessage(bins);
      }
    }
    return true;
  }
}

registerProcessor("audioProcessor", goertzelProc);
