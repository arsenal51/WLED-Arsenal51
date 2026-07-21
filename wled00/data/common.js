var d=document;
var loc = false, locip, locproto = "http:";

function H(pg="")   {} // help links removed (branding scrub)
function GH()       {}
function gId(c)     { return d.getElementById(c); } // getElementById
function cE(e)      { return d.createElement(e); } // createElement
function gEBCN(c)   { return d.getElementsByClassName(c); } // getElementsByClassName
function gN(s)      { return d.getElementsByName(s)[0]; } // getElementsByName
function isE(o)     { return Object.keys(o).length === 0; } // isEmpty
function isO(i)     { return (i && typeof i === 'object' && !Array.isArray(i)); } // isObject
function isN(n)     { return !isNaN(parseFloat(n)) && isFinite(n); } // isNumber
// https://stackoverflow.com/questions/3885817/how-do-i-check-that-a-number-is-float-or-integer
function isF(n)     { return n === +n && n !== (n|0); } // isFloat
function isI(n)     { return n === +n && n === (n|0); } // isInteger
function toggle(el) { gId(el).classList.toggle("hide"); let n = gId('No'+el); if (n) n.classList.toggle("hide"); }
function tooltip(cont=null) {
	d.querySelectorAll((cont?cont+" ":"")+"[title]").forEach((element)=>{
		element.addEventListener("pointerover", ()=>{
			// save title
			element.setAttribute("data-title", element.getAttribute("title"));
			const tooltip = d.createElement("span");
			tooltip.className = "tooltip";
			tooltip.textContent = element.getAttribute("title");

			// prevent default title popup
			element.removeAttribute("title");

			let { top, left, width } = element.getBoundingClientRect();

			d.body.appendChild(tooltip);

			const { offsetHeight, offsetWidth } = tooltip;

			const offset = element.classList.contains("sliderwrap") ? 4 : 10;
			top -= offsetHeight + offset;
			left += (width - offsetWidth) / 2;

			tooltip.style.top = top + "px";
			tooltip.style.left = left + "px";
			tooltip.classList.add("visible");
		});

		element.addEventListener("pointerout", ()=>{
			d.querySelectorAll('.tooltip').forEach((tooltip)=>{
				tooltip.classList.remove("visible");
				d.body.removeChild(tooltip);
			});
			// restore title
			element.setAttribute("title", element.getAttribute("data-title"));
		});
	});
};
// sequential loading of external resources (JS or CSS) with retry, calls init() when done
function loadResources(files, init) {
	let i = 0;
	const loadNext = () => {
		if (i >= files.length) {
			if (init) {
				d.documentElement.style.visibility = 'visible'; // make page visible after all files are loaded if it was hidden (prevent ugly display)
				d.readyState === 'complete' ? init() : window.addEventListener('load', init);
			}
			return;
		}
		const file = files[i++];
		const isCSS = file.endsWith('.css');
		const el = d.createElement(isCSS ? 'link' : 'script');
		if (isCSS) {
			el.rel = 'stylesheet';
			el.href = file;
			const st = d.head.querySelector('style');
			if (st) d.head.insertBefore(el, st); // insert before any <style> to allow overrides
			else d.head.appendChild(el);
		} else {
			el.src = file;
			d.head.appendChild(el);
		}
		el.onload = () => {	loadNext(); };
		el.onerror = () => {
			i--; // load this file again
			setTimeout(loadNext, 100);
		};
	};
	loadNext();
}
// https://www.educative.io/edpresso/how-to-dynamically-load-a-js-file-in-javascript
function loadJS(FILE_URL, async = true, preGetV = undefined, postGetV = undefined) {
	let scE = d.createElement("script");
	scE.setAttribute("src", FILE_URL);
	scE.setAttribute("type", "text/javascript");
	scE.setAttribute("async", async);
	d.body.appendChild(scE);
	// success event 
	scE.addEventListener("load", () => {
		//console.log("File loaded");
		if (preGetV) preGetV();
		GetV();
		if (postGetV) postGetV();
	});
	// error event
	scE.addEventListener("error", (ev) => {
		console.log("Error on loading file", ev);
		alert("Loading of configuration script failed.\nIncomplete page data!");
	});
}
function getLoc() {
	let l = window.location;
	if (l.protocol == "file:") {
		loc = true;
		locip = localStorage.getItem('locIp');
		if (!locip) {
			locip = prompt("File Mode. Please enter WLED IP!");
			localStorage.setItem('locIp', locip);
		}
	} else {
		// detect reverse proxy
		let path = l.pathname;
		let paths = path.slice(1,path.endsWith('/')?-1:undefined).split("/");
		if (paths.length > 1) paths.pop(); // remove subpage (or "settings")
		if (paths.length > 0 && paths[paths.length-1]=="settings") paths.pop(); // remove "settings"
		if (paths.length > 1) {
			locproto = l.protocol;
			loc = true;
			locip = l.hostname + (l.port ? ":" + l.port : "") + "/" + paths.join('/');
		}
	}
}
function getURL(path) { return (loc ? locproto + "//" + locip : "") + path; }
function B()          { window.open(getURL("/settings"),"_self"); }
var timeout;
function showToast(text, error = false) {
	var x = gId("toast");
	if (!x) return;
	x.innerHTML = text;
	x.className = error ? "error":"show";
	clearTimeout(timeout);
	x.style.animation = 'none';
	timeout = setTimeout(function(){ x.className = x.className.replace("show", ""); }, 2900);
}
async function uploadFile(fileObj, name, callback) {
	let file = fileObj.files?.[0]; // get first file, "?"" = optional chaining in case no file is selected
  if (!file) { callback?.(false); return; }
	if (/\.json$/i.test(name)) { // same as name.toLowerCase().endsWith('.json')
    try {
      const minified = JSON.stringify(JSON.parse(await file.text())); // validate and minify JSON
      file = new Blob([minified], { type: file.type || "application/json" });
    } catch (err) {
      if (!confirm("JSON invalid. Continue?")) { callback?.(false); return; }
      // proceed with original file if invalid but user confirms
    }
  }
	var req = new XMLHttpRequest();
	req.addEventListener('load', function(){showToast(this.responseText,this.status >= 400); if(callback) callback(this.status < 400);});
	req.addEventListener('error', function(e){showToast("Upload failed",true); if(callback) callback(false);});
	req.open("POST", "/upload");
	var formData = new FormData();
	formData.append("data", file, name);
	req.send(formData);
	fileObj.value = '';
}
// connect to WebSocket, use parent WS or open new, callback function gets passed the new WS object
function connectWs(onOpen) {
	let ws;
	try {	ws = top.window.ws;} catch (e) {}
	// reuse if open
	if (ws && ws.readyState === WebSocket.OPEN) {
		if (onOpen) onOpen(ws);
	} else {
		// create new ws connection
		getLoc(); // ensure globals are up to date
		let url = loc ? getURL('/ws').replace("http", "ws")
									: "ws://" + window.location.hostname + "/ws";
		ws = new WebSocket(url);
		ws.binaryType = "arraybuffer";
		if (onOpen) ws.onopen = () => onOpen(ws);
	}
	return ws;
}

// send LED colors to ESP using WebSocket and DDP protocol (RGB)
// ws: WebSocket object
// start: start pixel index
// len: number of pixels to send
// colors: Uint8Array with RGB values (3*len bytes)
function sendDDP(ws, start, len, colors) {
	if (!colors || colors.length < len * 3) return false; // not enough color data
	let maxDDPpx = 472; // must fit into one WebSocket frame of 1428 bytes, DDP header is 10+1 bytes -> 472 RGB pixels
	//let maxDDPpx = 172; // ESP8266: must fit into one WebSocket frame of 528 bytes -> 172 RGB pixels TODO: add support for ESP8266?
	if (!ws || ws.readyState !== WebSocket.OPEN) return false;
	// send in chunks of maxDDPpx
	for (let i = 0; i < len; i += maxDDPpx) {
		let cnt = Math.min(maxDDPpx, len - i);
		let off = (start + i) * 3; // DDP pixel offset in bytes
		let dLen = cnt * 3;
		let cOff = i * 3; // offset in color buffer
		let pkt = new Uint8Array(11 + dLen); // DDP header is 10 bytes, plus 1 byte for WLED websocket protocol indicator
		pkt[0] = 0x02; // DDP protocol indicator for WLED websocket. Note: below DDP protocol bytes are offset by 1
		pkt[1] = 0x40; // flags: 0x40 = no push, 0x41 = push (i.e. render), note: this is DDP protocol byte 0
		pkt[2] = 0x00; // reserved
		pkt[3] = 0x01; // 1 = RGB (currently only supported mode)
		pkt[4] = 0x01; // destination id (not used but 0x01 is default output)
		pkt[5] = (off >> 24) & 255; // DDP protocol 4-7 is offset
		pkt[6] = (off >> 16) & 255;
		pkt[7] = (off >> 8) & 255;
		pkt[8] = off & 255;
		pkt[9] = (dLen >> 8) & 255; // DDP protocol 8-9 is data length
		pkt[10] = dLen & 255;
		pkt.set(colors.subarray(cOff, cOff + dLen), 11);
		if(i + cnt >= len) {
			pkt[1] = 0x41;  //if this is last packet, set the "push" flag to render the frame
		}
		try {
			ws.send(pkt.buffer);
		} catch (e) {
			console.error(e);
			return false;
		}
	}
	return true;
}

// ---- Arsenal51 branded form controls: rocker toggles + custom dropdowns ----
// Shared across every settings page (all load common.js). Native <select> popups
// are OS-drawn and unbrandable, so each is wrapped in a styled listbox while the
// real <select> stays in the DOM for form submit and the WLED populate script.
(function(){
	function bcStyle(){
		if (gId('bc-style')) return;
		var css = [
		".bc-scope input[type=checkbox]{appearance:none;-webkit-appearance:none;position:relative;width:46px;height:26px;min-width:46px;flex-shrink:0;border-radius:99px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);cursor:pointer;transition:background .25s,box-shadow .25s;margin:0 9px 0 0;vertical-align:middle}",
		".bc-scope input[type=checkbox]::before{content:'';position:absolute;top:50%;left:3px;width:18px;height:18px;transform:translateY(-50%);border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.5);transition:left .22s cubic-bezier(.4,.9,.3,1.3),background .22s}",
		".bc-scope input[type=checkbox]:checked{background:linear-gradient(135deg,#64d5ff,#4ab8e6);border-color:transparent;box-shadow:0 0 12px rgba(100,213,255,.42)}",
		".bc-scope input[type=checkbox]:checked::before{left:25px;background:#00161f}",
		".bc-scope input[type=checkbox]:focus-visible{outline:2px solid #64d5ff;outline-offset:2px}",
		".bc-scope table input[type=checkbox],.bc-scope td input[type=checkbox]{appearance:auto;-webkit-appearance:auto;width:18px;min-width:0;height:18px;border-radius:0;background:none;border:none;box-shadow:none;accent-color:#64d5ff;margin:0}",
		".bc-scope table input[type=checkbox]::before,.bc-scope td input[type=checkbox]::before{display:none}",
		".bsel{position:relative;display:inline-block;vertical-align:middle;font-family:inherit}",
		".bsel-btn{display:inline-flex;align-items:center;gap:10px;justify-content:space-between;width:100%;min-width:96px;font-family:inherit;font-weight:600;font-size:.9rem;color:#e8f4fa;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:9px 12px;cursor:pointer;transition:border-color .2s,box-shadow .2s;text-align:left;line-height:1.2}",
		".bsel-btn:hover{border-color:rgba(100,213,255,.4)}",
		".bsel.open .bsel-btn{border-color:#64d5ff;box-shadow:0 0 0 3px rgba(100,213,255,.15)}",
		".bsel-btn>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
		".bsel-cv{width:11px;height:8px;flex-shrink:0;transition:transform .2s;color:#64d5ff}",
		".bsel.open .bsel-cv{transform:rotate(180deg)}",
		".bsel-list{position:absolute;z-index:60;top:calc(100% + 6px);left:0;min-width:100%;max-height:264px;overflow-y:auto;background:rgba(16,21,27,.97);border:1px solid rgba(100,213,255,.25);border-radius:12px;padding:5px;box-shadow:0 18px 44px rgba(0,0,0,.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:none;scrollbar-width:thin}",
		".bsel.open .bsel-list{display:block;animation:bselin .16s cubic-bezier(.2,.8,.2,1)}",
		"@keyframes bselin{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}",
		".bsel-opt{padding:9px 11px;border-radius:8px;font-size:.88rem;color:#e8f4fa;cursor:pointer;white-space:nowrap;transition:background .12s}",
		".bsel-opt:hover{background:rgba(100,213,255,.13)}",
		".bsel-opt.sel{background:linear-gradient(120deg,rgba(100,213,255,.2),rgba(100,213,255,.05));color:#64d5ff;font-weight:700}",
		".bsel-list::-webkit-scrollbar{width:7px}.bsel-list::-webkit-scrollbar-thumb{background:rgba(100,213,255,.3);border-radius:8px}",
		// radios
		".bc-scope input[type=radio]{accent-color:#64d5ff;width:18px;height:18px;vertical-align:middle;cursor:pointer}",
		// number steppers (overlay, no layout shift): hide native spinners, add branded up/down
		".bc-scope input[type=number]{-moz-appearance:textfield}",
		".bc-scope input[type=number]::-webkit-outer-spin-button,.bc-scope input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}",
		".bnum{position:relative;display:inline-block;vertical-align:middle}",
		".bnum>input{padding-right:26px!important}",
		".bnum-s{position:absolute;right:1px;top:1px;bottom:1px;width:22px;display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,.1);border-radius:0 10px 10px 0;overflow:hidden}",
		".bnum-s button{flex:1;display:flex;align-items:center;justify-content:center;border:none;background:none;color:#64d5ff;cursor:pointer;padding:0;opacity:.65;transition:opacity .15s,background .15s}",
		".bnum-s button:hover{opacity:1;background:rgba(100,213,255,.16)}",
		".bnum-s button:active{background:rgba(100,213,255,.28)}",
		".bnum-s svg{width:9px;height:6px}",
		// breathing room for rows and controls
		".bc-scope .inline-field{gap:14px;padding:12px 0;flex-wrap:wrap}",
		".bc-scope .cb-row{gap:14px;padding:12px 0}",
		".bc-scope .field-wrap{padding:12px 0}",
		".bc-scope .bsel,.bc-scope .bnum{margin:2px 0}"
		].join("");
		var s = cE('style'); s.id = 'bc-style'; s.textContent = css; d.head.appendChild(s);
	}
	var CHEV = '<svg class="bsel-cv" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 6 5-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	function optText(sel){ var o = sel.options[sel.selectedIndex]; return o ? o.textContent : ""; }
	function syncOne(w){
		var sel = w._sel; if (!sel) return;
		if (sel.options.length !== w._opts.length) buildList(w);
		w._t.textContent = optText(sel) || " ";
		var v = sel.value;
		w._opts.forEach(function(o){ o.classList.toggle('sel', o.dataset.v === v); });
	}
	function buildList(w){
		var sel = w._sel; w._list.innerHTML = ''; w._opts = [];
		Array.prototype.forEach.call(sel.options, function(op){
			var o = cE('div'); o.className = 'bsel-opt'; o.dataset.v = op.value; o.textContent = op.textContent;
			o.addEventListener('click', function(e){
				e.stopPropagation();
				sel.value = op.value;
				sel.dispatchEvent(new Event('input', {bubbles:true}));
				sel.dispatchEvent(new Event('change', {bubbles:true}));
				syncOne(w); closeAll();
			});
			w._list.appendChild(o); w._opts.push(o);
		});
	}
	function build(sel){
		if (sel.dataset.bc || sel.multiple) return;
		sel.dataset.bc = '1';
		var w = cE('div'); w.className = 'bsel';
		sel.parentNode.insertBefore(w, sel);
		w.appendChild(sel); sel.style.display = 'none';
		var btn = cE('button'); btn.type = 'button'; btn.className = 'bsel-btn';
		var t = cE('span'); btn.appendChild(t); btn.insertAdjacentHTML('beforeend', CHEV);
		var list = cE('div'); list.className = 'bsel-list';
		w._sel = sel; w._t = t; w._list = list; w._opts = [];
		buildList(w);
		btn.addEventListener('click', function(e){
			e.stopPropagation();
			var wasOpen = w.classList.contains('open');
			closeAll();
			if (!wasOpen) { buildList(w); syncOne(w); w.classList.add('open'); }
		});
		w.appendChild(btn); w.appendChild(list);
		syncOne(w);
	}
	function closeAll(){ d.querySelectorAll('.bsel.open').forEach(function(w){ w.classList.remove('open'); }); }
	var UP = '<svg viewBox="0 0 9 6" fill="none"><path d="M1 5l3.5-4 3.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	var DN = '<svg viewBox="0 0 9 6" fill="none"><path d="M1 1l3.5 4 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	function buildNum(inp){
		if (inp.dataset.bc || inp.closest('table')) return; // leave dense table inputs plain
		inp.dataset.bc = '1';
		var w = cE('div'); w.className = 'bnum';
		inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
		var s = cE('div'); s.className = 'bnum-s';
		var up = cE('button'); up.type = 'button'; up.tabIndex = -1; up.innerHTML = UP;
		var dn = cE('button'); dn.type = 'button'; dn.tabIndex = -1; dn.innerHTML = DN;
		function step(dir){
			var st = parseFloat(inp.step) || 1, v = parseFloat(inp.value);
			if (isNaN(v)) v = inp.min !== '' ? parseFloat(inp.min) : 0;
			v += dir * st;
			if (inp.min !== '' && v < parseFloat(inp.min)) v = parseFloat(inp.min);
			if (inp.max !== '' && v > parseFloat(inp.max)) v = parseFloat(inp.max);
			var dec = (String(st).split('.')[1] || '').length;
			inp.value = dec ? parseFloat(v.toFixed(dec)) : v;
			inp.dispatchEvent(new Event('input', {bubbles:true}));
			inp.dispatchEvent(new Event('change', {bubbles:true}));
		}
		up.addEventListener('click', function(e){ e.preventDefault(); step(1); });
		dn.addEventListener('click', function(e){ e.preventDefault(); step(-1); });
		s.appendChild(up); s.appendChild(dn); w.appendChild(s);
	}
	function enhance(){
		d.querySelectorAll('form[name=Sf] select').forEach(build);
		d.querySelectorAll('form[name=Sf] input[type=number]').forEach(buildNum);
	}
	function syncAll(){ d.querySelectorAll('.bsel').forEach(syncOne); }
	function bcInit(){
		if (!d.forms || !d.forms.Sf) return; // settings pages only
		d.forms.Sf.classList.add('bc-scope');
		bcStyle();
		enhance();
		d.addEventListener('click', closeAll);
		d.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeAll(); });
		// re-enhance dynamically generated selects (DMX channels, 2D panels, time macros)
		try {
			new MutationObserver(function(){ enhance(); }).observe(d.forms.Sf, {childList:true, subtree:true});
		} catch(e) {}
		// reflect programmatic value changes made by the settings populate script
		setInterval(syncAll, 300);
	}
	if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', bcInit); else bcInit();
})();
