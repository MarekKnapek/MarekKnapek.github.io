"use strict";


function info_wasm_call_generic(main_obj, fn_id, arg)
{
	"use strict";
	main_obj.wi.exports.majn();
}

function info_wasm_call_main(main_obj)
{
	"use strict";
	info_wasm_call_generic(main_obj);
}

function info_on_event(main_obj)
{
	"use strict";
	info_wasm_call_main(main_obj);
}

function info_trigger_event(main_obj)
{
	"use strict";
	info_on_event(main_obj);
}

function info_on_wasm_loaded_gud(main_obj, wm)
{
	"use strict";
	const wi = wm.instance;
	main_obj.wm = wm;
	main_obj.wi = wi;
	info_trigger_event(main_obj);
}

function info_on_wasm_loaded_bad(main_obj, reason)
{
	"use strict";
	console.log(reason);
}

function info_js_print(main_obj, str_ptr, str_len)
{
	"use strict";
	const str_buf = new Uint8Array(main_obj.mem.buffer, str_ptr, str_len);
	const str_obj = new TextDecoder().decode(str_buf);
	const str_elm = document.getElementById("stdout");
	str_elm.innerText += str_obj;
}

function info_create_import_object(main_obj)
{
	"use strict";
	const memory = new WebAssembly.Memory({initial: 32, maximum: 32, });
	const stack_ptr = new WebAssembly.Global({value: "i32", mutable: true, }, 1 * 1024 * 1024);
	const memory_base = new WebAssembly.Global({value: "i32", mutable: false, }, 0);
	const import_object =
	{
		env:
		{
			memory: memory,
			__stack_pointer: stack_ptr,
			__memory_base: memory_base,
			js_print: function(str_ptr, str_len){ "use strict"; info_js_print(main_obj, str_ptr, str_len); },
		},
	};
	main_obj.mem = memory;
	return import_object;
}

function info_fetch_wasm(main_obj)
{
	"use strict";
	const import_object = info_create_import_object(main_obj);
	const fp = fetch("info.wasm");
	const wp = WebAssembly.instantiateStreaming(fp, import_object);
	wp.then
	(
		function(wm){ "use strict"; info_on_wasm_loaded_gud(main_obj, wm); },
		function(reason){ "use strict"; info_on_wasm_loaded_bad(main_obj, reason); }
	);
}

function info_create_main_object()
{
	"use strict";
	let main_obj =
	{
		wm: null,
		wi: null,
		mem: null,
	};
	return main_obj;
}

function info_on_window_loaded()
{
	"use strict";
	const main_obj = info_create_main_object();
	info_fetch_wasm(main_obj);
}

function info_start()
{
	"use strict";
	window.addEventListener("load", info_on_window_loaded);
}

info_start();
