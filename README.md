# ppm-decoder

Nielsen PPM is a "hidden" identifier that can be embedded in a sound signal.
One modulation method, [CBET](https://www.sigidwiki.com/wiki/CBET) (which could stand for "Critical Band Encoded Telemetry"?) goes from 1-3 kHz
using 10 MFSK subcarriers and encoding 18 different 400ms long symbols across all of them.
It'is used on FM and MW AM radio, and it tries to be strong enough to decode, while quiet enough to not affect casual listening.
2 symbols (*[* and *]*) are used for sync while the other 16 act as hexadecimal digits for a station ID and time code.

This is a PPM CBET decoder that seems to work.
It uses an FFT to decode the symbols, syncronises the signal, and gives you the decoded ID and time code.

---

*Generative AI was not used in the creation of this page.* I just like actually writing properly.
Copyright 2026 Chase T. Licensed under the BSD 3-clause license.
