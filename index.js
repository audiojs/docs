require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t(e.hyperapp=e.hyperapp||{})}(this,function(e){"use strict";function t(e,n,o){n.ns="http://www.w3.org/2000/svg";for(var r=0;r<o.length;r++){var a=o[r];a.data&&t(a.tag,a.data,a.children)}}function n(e,t){var n,o={};for(var r in e){var a=[];if("*"!==r&&(t.replace(new RegExp("^"+r.replace(/\//g,"\\/").replace(/:([A-Za-z0-9_]+)/g,function(e,t){return a.push(t),"([A-Za-z0-9_]+)"})+"/?$","g"),function(){for(var e=1;e<arguments.length-2;e++)o[a.shift()]=arguments[e];n=r}),n))break}return{match:n||"*",params:o}}var o,r,a,i=[],c=function(e,n){var c,f;for(a=[],o=arguments.length;o-- >2;)i.push(arguments[o]);for(;i.length;)if(Array.isArray(r=i.pop()))for(o=r.length;o--;)i.push(r[o]);else null!=r&&r!==!0&&r!==!1&&("number"==typeof r&&(r+=""),c="string"==typeof r,c&&f?a[a.length-1]+=r:(a.push(r),f=c));return"function"==typeof e?e(n,a):("svg"===e&&t(e,n,a),{tag:e,data:n||{},children:a})},f=function(e){function t(e){for(var t=0;t<w.onError.length;t++)w.onError[t](e);if(t<=0)throw e}function n(e,o,i){Object.keys(o).forEach(function(c){e[c]||(e[c]={});var f,u=i?i+"."+c:c,d=o[c];"function"==typeof d?e[c]=function(e){for(f=0;f<w.onAction.length;f++)w.onAction[f](u,e);var n=d(h,e,y,t);if(void 0===n||"function"==typeof n.then)return n;for(f=0;f<w.onUpdate.length;f++)w.onUpdate[f](h,n,e);h=a(h,n),r(h,m)}:n(e[c],d,u)})}function o(e){"l"!==document.readyState[0]?e():document.addEventListener("DOMContentLoaded",e)}function r(e,t){for(n=0;n<w.onRender.length;n++)t=w.onRender[n](e,t);p(g,v,v=t(e,y),0);for(var n=0;n<A.length;n++)A[n]();A=[]}function a(e,t){var n,o={};if(i(t)||Array.isArray(t))return t;for(n in e)o[n]=e[n];for(n in t)o[n]=t[n];return o}function i(e){return e=typeof e,"string"===e||"number"===e||"boolean"===e}function c(e,t){setTimeout(function(){e(t)},0)}function f(e,t){return e.tag!==t.tag||typeof e!=typeof t||i(e)&&e!==t}function u(e){var t;if("string"==typeof e)t=document.createTextNode(e);else{t=e.data&&e.data.ns?document.createElementNS(e.data.ns,e.tag):document.createElement(e.tag);for(var n in e.data)"onCreate"===n?c(e.data[n],t):s(t,n,e.data[n]);for(var o=0;o<e.children.length;o++)t.appendChild(u(e.children[o]))}return t}function d(e,t,n){e.removeAttribute("className"===t?"class":t),"boolean"!=typeof n&&"true"!==n&&"false"!==n||(e[t]=!1)}function s(e,t,n,o){if("style"===t)for(var r in n)e.style[r]=n[r];else if("o"===t[0]&&"n"===t[1]){var a=t.substr(2).toLowerCase();e.removeEventListener(a,o),e.addEventListener(a,n)}else"false"===n||n===!1?(e.removeAttribute(t),e[t]=!1):(e.setAttribute(t,n),"http://www.w3.org/2000/svg"!==e.namespaceURI&&(e[t]=n))}function l(e,t,n){for(var o in a(n,t)){var r=t[o],i=n[o],f=e[o];void 0===r?d(e,o,i):"onUpdate"===o?c(r,e):(r!==i||"boolean"==typeof f&&f!==r)&&s(e,o,r,i)}}function p(e,t,n,o){if(void 0===t)e.appendChild(u(n));else if(void 0===n){var r=e.childNodes[o];A.push(e.removeChild.bind(e,r)),t&&t.data&&t.data.onRemove&&c(t.data.onRemove,r)}else if(f(n,t))e.replaceChild(u(n),e.childNodes[o]);else if(n.tag){var r=e.childNodes[o];l(r,n.data,t.data);for(var a=n.children.length,i=t.children.length,d=0;d<a||d<i;d++){var s=n.children[d];p(r,t.children[d],s,d)}}}for(var h,v,g,m=e.view||function(){return""},y={},b=[],w={onError:[],onAction:[],onUpdate:[],onRender:[]},E=[e].concat((e.plugins||[]).map(function(t){return t(e)})),A=[],R=0;R<E.length;R++){var C=E[R];void 0!==C.model&&(h=a(h,C.model)),C.actions&&n(y,C.actions),C.subscriptions&&(b=b.concat(C.subscriptions));var L=C.hooks;L&&Object.keys(L).forEach(function(e){w[e].push(L[e])})}o(function(){g=e.root||document.body.appendChild(document.createElement("div")),r(h,m);for(var n=0;n<b.length;n++)b[n](h,y,t)})},u=function(e){return{model:{router:n(e.view,location.pathname)},actions:{router:{match:function(t,o){return{router:n(e.view,o)}},go:function(e,t,n){history.pushState({},"",t),n.router.match(t)}}},hooks:{onRender:function(t){return e.view[t.router.match]}},subscriptions:[function(e,t){addEventListener("popstate",function(){t.router.match(location.pathname)})}]}};e.h=c,e.app=f,e.Router=u});


},{}],2:[function(require,module,exports){
var modules = require('modules');

var _require = require('hyperapp'),
    app = _require.app,
    h = _require.h;

app({
  root: document.querySelector('.main'),

  model: {},

  view: function (state, actions) {
    return h('div', { class: 'app' }, modules.map(function (projects) {
      return h('div', {}, projects.name);
    }));
  }
});
},{"hyperapp":1,"modules":"modules"}],"modules":[function(require,module,exports){
module.exports=[{"name":"audiojs/audio","link":"https://github.com/audiojs/audio","stars":37,"readme":"# Audio [![build status][travis-i]][travis] [![gitter][gitter-i]][gitter]\n> Framework for handling audio in JavaScript.\n\n```javascript\n// Use streams to create, manipulate, or serialize audio.\n// For example, decoding and encoding with audio-wav:\nfs.createReadStream('./foo.wav').pipe(wav.decode())\n\n// Create your own streams to use the PCM data directly.\n.pipe(through2.obj(function(audio, enc, callback) {\n  // Read pulse values\n  var left = audio.read(200, 1);\n  var right = audio.read(100, 2);\n\n  // Write pulse values\n  audio.write(7, 500, 2);\n\n  // Push audio to continue pipe chain.\n  callback(null, audio);\n}));\n```\n\nA framework and object for using audio in JavaScript.  Based on top of streams to allow chaining utilities that wrap more complex operations.\n\n## Documentation\nSee [the `docs/` folder](docs/) for info on the framework and object.  Use [StackOverflow][stackoverflow] for your questions.\n\n## Installation\nUse the [npm keyword \"audiojs\"][npm-audiojs] to find utilities (with directions in their own READMEs).\n\nIf you are creating a utility and need to use the `Audio` object:\n```shell\n$ npm install --save audio\n```\n(Use `audio@next` for latest prerelease versions)\n\n## Credits\n\n|  ![jamen][author-avatar]  |\n|:-------------------------:|\n| [Jamen Marz][author-site] |\n\n## License\n[MIT](LICENSE) &copy; Jamen Marz\n\n\n[travis]: https://travis-ci.org/audiojs/audio\n[travis-i]: https://travis-ci.org/audiojs/audio.svg\n[gitter]: https://gitter.im/audiojs/audio\n[gitter-i]: https://badges.gitter.im/Join%20Chat.svg\n[npm-audiojs]: https://www.npmjs.com/browse/keyword/audiojs\n[author-site]: https://github.com/jamen\n[author-avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125\n[stackoverflow]: http://stackoverflow.com/questions/ask\n"},{"name":"audiojs/audio-buffer","link":"https://github.com/audiojs/audio-buffer","stars":14,"readme":"# audio-buffer [![Build Status](https://travis-ci.org/audiojs/audio-buffer.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\n[AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) ponyfill. Provides useful constructor for Web-Audio API _AudioBuffer_, if available, otherwise provides optimal _AudioBuffer_ implementation for node/browsers. Useful instead of _Buffer_ in audio streams (see [**@audiojs**](https://github.com/audiojs) components).\n\n## Usage\n\n[![npm install audio-buffer](https://nodei.co/npm/audio-buffer.png?mini=true)](https://npmjs.org/package/audio-buffer/)\n\n```js\nvar AudioBuffer = require('audio-buffer')\n\n//Create audio buffer from a data source or of a length.\n//Data is interpreted as a planar sequence of float32 samples.\n//It can be Array, TypedArray, ArrayBuffer, Buffer, AudioBuffer, DataView, NDArray etc.\nvar buffer = new AudioBuffer(channels = 2, data|length, sampleRate = 44100)\n\n//Duration of the underlying audio data, in seconds\nbuffer.duration\n\n//Number of samples per channel\nbuffer.length\n\n//Default sample rate is 44100\nbuffer.sampleRate\n\n//Default number of channels is 2\nbuffer.numberOfChannels\n\n//Get array containing the data for the channel (not copied)\nbuffer.getChannelData(channel)\n\n//Place data from channel to destination Float32Array\nbuffer.copyFromChannel(destination, channelNumber, startInChannel = 0)\n\n//Place data from source Float32Array to the channel\nbuffer.copyToChannel(source, channelNumber, startInChannel = 0)\n\n\n//Some special properties, itâs unlikely you will ever need them.\n\n//Type of array for data. Float64Array is faster for modern node/browsers.\nAudioBuffer.FloatArray = Float64Array\n\n//In browser, you can set custom audio context (online/offline).\nAudioBuffer.context = require('audio-context')\n\n//Whether WebAudioAPI AudioBuffer should be created, if avail, instead of polyfilled structure\nAudioBuffer.isWAA = true\n```\n\n## See also\n\n* [audio-buffer-utils](https://github.com/audiojs/audio-buffer-utils) â utils for audio buffers\n* [pcm-util](https://npmjs.org/package/pcm-util) â utils for audio format convertions.\n\n## Similar\n\n* [ndsamples](https://github.com/livejs/ndsamples) â audio-wrapper for ndarrays. A somewhat alternative approach to wrap audio data, based on ndarrays, used by some modules in [livejs](https://github.com/livejs).\n* [1](https://www.npmjs.com/package/audiobuffer), [2](https://www.npmjs.com/package/audio-buffer), [3](https://github.com/sebpiq/node-web-audio-api/blob/master/lib/AudioBuffer.js), [4](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) â other AudioBuffer implementations.\n* [audiodata](https://www.npmjs.com/package/audiodata) alternative data holder from @mohayonao.\n"},{"name":"audiojs/audio-oscillator","link":"https://github.com/audiojs/audio-oscillator","stars":6,"readme":"# audio-oscillator [![Build Status](https://travis-ci.org/audiojs/audio-oscillator.svg?branch=master)](https://travis-ci.org/audiojs/audio-oscillator) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nOscillate some periodic wave into stream. [OscillatorNode](http://webaudio.github.io/web-audio-api/#the-oscillatornode-interface) in stream land.\n\n## Usage\n\n[![$ npm install audio-oscillator](http://nodei.co/npm/audio-oscillator.png?mini=true)](http://npmjs.org/package/audio-oscillator)\n\n```js\nvar Oscillator = require('audio-oscillator');\nvar Speaker = require('audio-speaker');\nvar Slice = require('audio-slice');\n\nOscillator({\n\t//in hz\n\tfrequency: 440,\n\n\t//in cents\n\tdetune: 0,\n\n\t//sine, triangle, square, saw, pulse, wave\n\ttype: 'sine',\n\n\t//normalize result of `wave` type\n\tnormalize: true\n})\n.pipe(Slice(1))\n.pipe(Speaker());\n\n\n//Set periodic wave from arrays of real and imaginary coefficients\noscillator.setPeriodicWave(real, imag);\n```\n\n## Related\n\n> [audio-generator](https://github.com/audiojs/audio-generator) â generate audio stream with a function.<br/>\n> [audio-speaker](https://github.com/audiojs/audio-speaker) â output audio stream to speaker in node/browser.<br/>\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â stream to web-audio node.<br/>\n"},{"name":"audiojs/audio-speaker","link":"https://github.com/audiojs/audio-speaker","stars":33,"readme":"#audio-speaker [![Build Status](https://travis-ci.org/audiojs/audio-speaker.svg?branch=master)](https://travis-ci.org/audiojs/audio-speaker) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nOutput audio stream to speaker in node or browser.\n\n[![npm install audio-speaker](https://nodei.co/npm/audio-speaker.png?mini=true)](https://npmjs.org/package/audio-speaker/)\n\n\n### Use as a stream\n\n```js\nvar Speaker = require('audio-speaker/stream');\nvar Generator = require('audio-generator/stream');\n\nGenerator(function (time) {\n\t//panned unisson effect\n\tvar Ï = Math.PI * 2;\n\treturn [Math.sin(Ï * time * 441), Math.sin(Ï * time * 439)];\n})\n.pipe(Speaker({\n\t//PCM input format defaults, optional.\n\t//channels: 2,\n\t//sampleRate: 44100,\n\t//byteOrder: 'LE',\n\t//bitDepth: 16,\n\t//signed: true,\n\t//float: false,\n\t//interleaved: true,\n}));\n```\n\n### Use as a pull-stream\n\n```js\nconst pull = require('pull-stream/pull');\nconst speaker = require('audio-speaker/pull');\nconst osc = require('audio-oscillator/pull');\n\npull(osc({frequency: 440}), speaker());\n```\n\n### Use directly\n\nSpeaker is [async-sink](https://github.com/audiojs/contributing/wiki/Streams-convention) with `fn(data, cb)` notation.\n\n```js\nconst createSpeaker = require('audio-speaker');\nconst createGenerator = require('audio-generator');\n\nlet output = createSpeaker();\nlet generate = createGenerator(t => Math.sin(t * Math.PI * 2 * 440));\n\n(function loop (err, buf) {\n\tlet buffer = generate();\n\toutput(buffer, loop);\n})();\n```\n\n#### Related\n\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â stream data to web-audio.<br/>\n> [audio-through](http://npmjs.org/package/audio-through) â universal stream for processing audio.<br/>\n> [node-speaker](http://npmjs.org/package/speaker) â output pcm stream to speaker in node.<br/>\n> [audio-feeder](https://github.com/brion/audio-feeder) â cross-browser speaker for pcm data.<br/>\n"}]
},{}]},{},[2]);
