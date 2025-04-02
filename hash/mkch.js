"use strict";

function mkch_show_msg(app, msg)
{
	"use strict";
	console.log(msg); /* todo */
}

function mkch_show_error_msg(app, msg)
{
	"use strict";
	const message = `Error! ${msg}`;
	mkch_show_msg(app, message);
}

function mkch_show_error_reason(app, reason, msg)
{
	"use strict";
	const message = `Message: ${msg} Reason: ${reason}.`;
	mkch_show_error_msg(ap, message);
}

function mkch_is_integer_non_negative(x)
{
	"use strict";
	let gud = true;
	gud = gud && typeof x === "number";
	gud = gud && isFinite(x);
	gud = gud && Math.round(x) == x;
	gud = gud && x >= 0;
	gud = gud && x <= 2 * 1024 * 1024;
	return gud;
}

function mkch_is_integer_positive(x)
{
	"use strict";
	let gud = true;
	gud = gud && typeof x === "number";
	gud = gud && isFinite(x);
	gud = gud && Math.round(x) == x;
	gud = gud && x >= 1;
	gud = gud && x <= 2 * 1024 * 1024;
	return gud;
}

function mkch_buf_to_str(buf)
{
	"use strict";
	const alphabet = "0123456789abcdef";
	const n = buf.byteLength;
	const storage = new Uint8Array(n * 2);
	for(let i = 0; i != n; ++i)
	{
		const b = buf[i] & 0xff;
		const hi = (b >> 4) & 0xf;
		const lo = (b >> 0) & 0xf;
		storage[i * 2 + 0] = alphabet.codePointAt(hi);
		storage[i * 2 + 1] = alphabet.codePointAt(lo);
	}
	const txt = new TextDecoder().decode(storage);
	return txt;
}

function mkch_sub_block(block, off, len)
{
	"use strict";
	console.assert(block instanceof Uint8Array);
	console.assert(mkch_is_integer_non_negative(off));
	console.assert(mkch_is_integer_positive(len));
	console.assert(block.byteLength > off);
	console.assert(block.byteLength >= off + len);
	const sub = new Uint8Array(block.buffer, block.byteOffset + off, len);
	return sub;
}

function mkch_memcpy(dst_buff, dst_off, src_buff, src_off, amount)
{
	"use strict";
	console.assert(dst_buff instanceof Uint8Array);
	console.assert(mkch_is_integer_non_negative(dst_off));
	console.assert(src_buff instanceof Uint8Array);
	console.assert(mkch_is_integer_non_negative(src_off));
	console.assert(mkch_is_integer_positive(amount));
	console.assert(dst_buff.byteLength > dst_off);
	console.assert(dst_buff.byteLength >= dst_off + amount);
	console.assert(src_buff.byteLength > src_off);
	console.assert(src_buff.byteLength >= src_off + amount);
	const dst_tmp = mkch_sub_block(dst_buff, dst_off, amount);
	const src_tmp = mkch_sub_block(src_buff, src_off, amount);
	dst_tmp.set(src_tmp, 0);
}

function mkch_get_mem(app, off, len)
{
	"use strict";
	const buf = new Uint8Array(app.m_wasm_instance.exports.memory.buffer, off, len);;
	return buf;
}

function mkch_get_buf(app)
{
	"use strict";
	const off = app.m_wasm_instance.exports.mk_clib_hasher_get_buffer_buf();
	const len = app.m_wasm_instance.exports.mk_clib_hasher_get_buffer_len();
	const buf = mkch_get_mem(app, off, len);
	return buf;
}

function mkch_file_done(app)
{
	"use strict";
	const finished = app.m_wasm_instance.exports.mk_clib_hasher_finish(app.m_job.m_args.m_xof_len);
	console.assert(finished === 0);
	const digest_len = app.m_wasm_instance.exports.mk_clib_hasher_get_digest_len(app.m_job.m_args.m_alg_idx);
	const out_len = digest_len == 0 ? app.m_job.m_args.m_xof_len : digest_len;
	const digest_buf = mkch_sub_block(mkch_get_buf(app), 0, out_len);
	const digest_str = mkch_buf_to_str(digest_buf);
	document.getElementById("resultb").textContent = digest_str;
	app.m_job = null;
}

function mkch_hash_progress(app)
{
	"use strict";
	const percent = ((app.m_job.m_file_finished * 100.0) / app.m_job.m_file_size).toFixed(2) + " %";
	document.getElementById("resultb").textContent = percent;
}

function mkch_file_read_finished(app)
{
	"use strict";
	console.assert(app.m_job.m_file_iorps.length >= 1);
	for(;;)
	{
		if(app.m_job.m_file_iorps.length === 0)
		{
			break;
		}
		const iorp = app.m_job.m_file_iorps[0];
		if(iorp.m_event === null)
		{
			break;
		}
		const chunk_data = new Uint8Array(iorp.m_event.target.result);
		const chunk_size = chunk_data.byteLength;
		const mem = mkch_get_buf(app);
		mkch_memcpy(mem, 0, chunk_data, 0, chunk_size);
		const appended = app.m_wasm_instance.exports.mk_clib_hasher_append(chunk_size);
		console.assert(appended === 0);
		app.m_job.m_file_finished += chunk_size;
		mkch_hash_progress(app);
		app.m_job.m_file_iorps.shift();
	}
	app.m_job.m_file_step = 2;
	app.m_continue(app);
	if(app.m_job.m_file_finished === app.m_job.m_file_size)
	{
		mkch_file_done(app);
	}
}

function mkch_file_make_iorp(app)
{
	"use strict";
	const iorp =
	{
		m_event: null,
	};
	return iorp;
}

function mkch_file_read_chunks(app)
{
	"use strict";
	while(app.m_job.m_file_iorps.length < 32)
	{
		const rem = app.m_job.m_file_size - app.m_job.m_file_cur;
		if(rem === 0)
		{
			break;
		}
		const page_size = 64 * 1024;
		const slice_size = Math.min(rem, page_size);
		const beg = app.m_job.m_file_cur;
		const end = beg + slice_size;
		const slice_obj = app.m_job.m_file_obj.slice(beg, end);
		app.m_job.m_file_cur += slice_size;
		const iorp = mkch_file_make_iorp(app);
		app.m_job.m_file_iorps.push(iorp);
		const reader = new FileReader();
		reader.onload = function(event){ iorp.m_event = event; app.m_job.m_file_step = 1; app.m_continue(app); };
		reader.readAsArrayBuffer(slice_obj);
	}
}

function mkch_file_open(app)
{
	"use strict";
	document.getElementById("lengthl").hidden = !app.m_job.m_args.m_is_xof;
	document.getElementById("length").hidden = !app.m_job.m_args.m_is_xof;
	document.getElementById("resulta").textContent = app.m_job.m_args.m_alg_str;
	document.getElementById("resultb").textContent = "Starting...";
	document.getElementById("resulto").hidden = false;
	const inited = app.m_wasm_instance.exports.mk_clib_hasher_init(app.m_job.m_args.m_alg_idx);
	console.assert(inited === 0);
	const file_obj = app.m_job.m_args.m_filee.files[0];
	const file_size = file_obj.size;
	const file_cur = 0;
	app.m_job.m_file_obj = file_obj;
	app.m_job.m_file_size = file_size;
	app.m_job.m_file_cur = file_cur;
	mkch_file_read_chunks(app);
}

function mkch_hash_file(app)
{
	"use strict";
	const file_step = app.m_job.m_file_step;
	switch(file_step)
	{
		case 0: mkch_file_open(app); break;
		case 1: mkch_file_read_finished(app); break;
		case 2: mkch_file_read_chunks(app); break;
		default: console.assert(false); break;
	}
}

function mkch_hash_compute_text(app)
{
	"use strict";
	const buffer_buf = app.m_wasm_instance.exports.mk_clib_hasher_get_buffer_buf();
	const buffer_len = app.m_wasm_instance.exports.mk_clib_hasher_get_buffer_len();
	console.assert(buffer_buf != 0);
	console.assert(buffer_len >= 64 * 1024);
	const text_len = app.m_job.m_args.m_text_buf === null ? 0 : app.m_job.m_args.m_text_buf.byteLength;
	console.assert(text_len <= buffer_len);
	console.assert(app.m_job.m_args.m_xof_len <= buffer_len);
	const digest_len = app.m_wasm_instance.exports.mk_clib_hasher_get_digest_len(app.m_job.m_args.m_alg_idx);
	console.assert(digest_len == 0 || (digest_len >= 16 && digest_len <= 64));
	const inited = app.m_wasm_instance.exports.mk_clib_hasher_init(app.m_job.m_args.m_alg_idx);
	console.assert(inited === 0);
	const mem = mkch_get_buf(app);
	if(text_len != 0)
	{
		mkch_memcpy(mem, 0, app.m_job.m_args.m_text_buf, 0, app.m_job.m_args.m_text_buf.byteLength);
	}
	const appended = app.m_wasm_instance.exports.mk_clib_hasher_append(text_len);
	console.assert(appended === 0);
	const finished = app.m_wasm_instance.exports.mk_clib_hasher_finish(app.m_job.m_args.m_xof_len);
	console.assert(finished === 0);
	const digest_buf = mkch_get_mem(app, buffer_buf, digest_len == 0 ? app.m_job.m_args.m_xof_len : digest_len);
	const digest_str = mkch_buf_to_str(digest_buf);
	return digest_str;
}

function mkch_hash_text(app)
{
	"use strict";
	const digest = mkch_hash_compute_text(app);
	document.getElementById("lengthl").hidden = !app.m_job.m_args.m_is_xof;
	document.getElementById("length").hidden = !app.m_job.m_args.m_is_xof;
	document.getElementById("resulta").textContent = app.m_job.m_args.m_alg_str;
	document.getElementById("resultb").textContent = digest;
	document.getElementById("resulto").hidden = false;
	app.m_job = null;
}

function mkch_hash_drain(app)
{
	"use strict";
	while(app.m_job !== null && app.m_job.m_next !== null)
	{
		app.m_job = app.m_job.m_next;
	}
}

function mkch_hash_continue(app)
{
	"use strict";
	mkch_hash_drain(app);
	if(app.m_job === null)
	{
		return;
	}
	if(app.m_job.m_args.m_is_file === false)
	{
		mkch_hash_text(app);
	}
	else
	{
		mkch_hash_file(app);
	}
}

function mkch_make_job(app)
{
	"use strict";
	const job =
	{
		m_args: null,
		m_next: null,
		m_file_step: 0,
		m_file_obj: null,
		m_file_size: 0,
		m_file_cur: 0,
		m_file_finished: 0,
		m_file_iorps: [],
	};
	return job;
}

function mkch_prepare_args(app)
{
	"use strict";
	const texte = document.getElementById("text").value;
	const text_storage = new Uint8Array(texte.length * 3);
	const text_len = new TextEncoder().encodeInto(texte, text_storage).written;
	const text_buf = text_len == 0 ? null : mkch_sub_block(text_storage, 0, text_len);
	const filee = document.getElementById("file");
	const is_file = filee.value != "";
	const alge = document.getElementById("alg");
	const alg_idx = parseInt(alge.value, 10);
	console.assert(mkch_is_integer_non_negative(alg_idx));
	const digest_len = app.m_wasm_instance.exports.mk_clib_hasher_get_digest_len(alg_idx);
	const is_xof = digest_len == 0;
	const xof_len_base = 64;
	let xof_len_w;
	xof_len_w = document.getElementById("length").value;
	xof_len_w = parseInt(xof_len_w, 10);
	xof_len_w = Number.isNaN(xof_len_w) ? xof_len_base : xof_len_w;
	xof_len_w = xof_len_w <= 0 ? xof_len_base : xof_len_w;
	xof_len_w = xof_len_w > 16 * 1024 ? xof_len_base : xof_len_w;
	const xof_len_r = xof_len_w;
	const alg_str_base = alge.options[alge.selectedIndex].textContent;
	const alg_str_txt = ((is_file) ? ("File ") : ("")) + alg_str_base + ((is_xof) ? ("(" + (xof_len_r * 8) + ")") : (""));
	const args =
	{
		m_text_buf: text_buf,
		m_filee: filee,
		m_is_file: is_file,
		m_alg_idx: alg_idx,
		m_is_xof: is_xof,
		m_xof_len: xof_len_r,
		m_alg_str: alg_str_txt,
	};
	return args;
}

function mkch_hash_refresh(app)
{
	"use strict";
	const args = mkch_prepare_args(app);
	const job = mkch_make_job(app);
	job.m_args = args;
	if(app.m_job === null)
	{
		app.m_job = job;
		mkch_hash_continue(app);
	}
	else
	{
		app.m_job.m_next = job;
	}
}

function mkch_on_form_submit(app, event)
{
	"use strict";
	mkch_hash_refresh(app);
	return false;
}

function mkch_on_text_input(app, event)
{
	"use strict";
	document.getElementById("file").value = null;
	mkch_hash_refresh(app);
}

function mkch_on_file_change(app, event)
{
	"use strict";
	mkch_hash_refresh(app);
}

function mkch_on_alg_change(app, event)
{
	"use strict";
	mkch_hash_refresh(app);
}

function mkch_on_length_change(app, event)
{
	"use strict";
	mkch_hash_refresh(app);
}

function mkch_parse_url_fragment_query(app)
{
	"use strict";
	let arr = [];
	let f = decodeURIComponent(new URL(window.location.href).hash);
	if(f.length >= 2 && f[0] == '#' && f[1] == '?')
	{
		f = f.substring(2);
		for(;;)
		{
			if(f.length >= 3)
			{
				const eq = f.indexOf("=");
				if(eq != -1)
				{
					const key = f.substring(0, eq);
					f = f.substring(eq + 1);
					const amp = f.indexOf("&");
					if(amp != -1)
					{
						const val = f.substring(0, amp);
						f = f.substring(amp + 1);
						arr.push({ key: key, val: val, });
					}
					else
					{
						const val = f;
						arr.push({ key: key, val: val, });
						break;
					}
				}
				else
				{
					break;
				}
			}
			else
			{
				break;
			}
		}
	}
	return arr;
}

function mkch_parse_url(app)
{
	"use strict";
	const keyvals = mkch_parse_url_fragment_query(app);
	if(keyvals.length >= 1 && keyvals[0].key == "h")
	{
		const val = keyvals[0].val;
		let idx = 0;
		for(const key_arr of app.m_hash_keys)
		{
			const key_str = new TextDecoder().decode(key_arr).toLowerCase();
			if(val == key_str)
			{
				const alge = document.getElementById("alg");
				alge.value = idx.toString();
				mkch_hash_refresh(app);
				break;
			}
			++idx;
		}
	}
	let hast = false;
	let t;
	if(keyvals.length == 1 && keyvals[0].key == "t")
	{
		t = keyvals[0].val;
		hast = true;
	}
	else if(keyvals.length >= 2 && keyvals[1].key == "t")
	{
		t = keyvals[1].val;
		hast = true;
	}
	if(hast)
	{
		const texte = document.getElementById("text");
		texte.value = t;
		mkch_hash_refresh(app);
	}
}

function mkch_populate_events(app)
{
	"use strict";
	const form = document.getElementById("form");
	const text = document.getElementById("text");
	const file = document.getElementById("file");
	const alge = document.getElementById("alg");
	const length = document.getElementById("length");
	form.addEventListener("submit", function(event){ mkch_on_form_submit(app, event); } );
	text.addEventListener("input", function(event){ mkch_on_text_input(app, event); } );
	file.addEventListener("change", function(event){ mkch_on_file_change(app, event); } );
	alge.addEventListener("change", function(event){ mkch_on_alg_change(app, event); } );
	length.addEventListener("change", function(event){ mkch_on_length_change(app, event); } );
}

function mkch_populate_algs(app)
{
	"use strict";
	const alge = document.getElementById("alg");
	const alg_count = app.m_wasm_instance.exports.mk_clib_hasher_get_alg_count();
	for(let i = 0; i != alg_count; ++i)
	{
		const str_buf = app.m_wasm_instance.exports.mk_clib_hasher_get_alg_str_buf(i);
		const str_len = app.m_wasm_instance.exports.mk_clib_hasher_get_alg_str_len(i);
		const str_arr = mkch_get_mem(app, str_buf, str_len);
		const str_obj = new TextDecoder().decode(str_arr);
		const algi = new Option(str_obj, i.toString());
		alge.add(algi, undefined);
		const key_buf = app.m_wasm_instance.exports.mk_clib_hasher_get_alg_key_buf(i);
		const key_len = app.m_wasm_instance.exports.mk_clib_hasher_get_alg_key_len(i);
		const key_arr = mkch_get_mem(app, key_buf, key_len);
		app.m_hash_keys.push(key_arr);
	}
	const default_alg = app.m_wasm_instance.exports.mk_clib_hasher_get_default_alg();
	alge.selectedIndex = default_alg;
}

function mkch_on_wasm_loaded_bad(app, reason)
{
	"use strict";
	mkch_show_err_reason(app, reason, "Failed to instanciate WASM module.");
}

function mkch_on_wasm_loaded_gud(app, result_object)
{
	"use strict";
	app.m_wasm_module = result_object.module;
	app.m_wasm_instance = result_object.instance;
	mkch_show_msg(app, "Done loading WASM.");
	mkch_populate_algs(app);
	mkch_populate_events(app);
	mkch_parse_url(app);
}

function mkch_on_chunk_done_bad(app, reason)
{
	"use strict";
	mkch_show_error_reason(app, reason, "Input stream became errored.");
}

function mkch_on_chunk_done_gud(app, reader, controller, self, chunk_done)
{
	"use strict";
	if(chunk_done.done)
	{
		controller.close();
		return;
	}
	const chunk = chunk_done.value;
	const bytes_cnt_new = app.m_wasm_bytes + chunk.length;
	app.m_wasm_bytes = bytes_cnt_new;
	const kbs = Math.trunc(bytes_cnt_new / 1024).toLocaleString();
	const msg = `Loading WASM... ${kbs} kB.`;
	mkch_show_msg(app, msg);
	controller.enqueue(chunk);
	const chunk_done_p = reader.read();
	chunk_done_p.then( function(chunk_done){ self(app, reader, controller, self, chunk_done); }, function(reason){ mkch_on_chunk_done_bad(app, reason); } );
}

function mkch_on_reader_start(app, reader, controller)
{
	"use strict";
	const chunk_done_p = reader.read();
	chunk_done_p.then( function(chunk_done){ mkch_on_chunk_done_gud(app, reader, controller, mkch_on_chunk_done_gud, chunk_done); }, function(reason){ mkch_on_chunk_done_bad(app, reason); } );
}

function mkch_on_wasm_bad(app, reason)
{
	"use strict";
	mkch_show_err_reason(app, reason, "Failed to fetch WASM module.");
}

function mkch_on_wasm_gud(app, response)
{
	"use strict";
	if(!response.ok)
	{
		mkch_show_error_msg(app, "Failed to get WASM module.");
		return;
	}
	const readable_stream_orig = response.body;
	if(readable_stream_orig === null)
	{
		mkch_show_error_msg(app, "WASM response has no body.");
		return;
	}
	const response_orig = response;
	const reader_orig = readable_stream_orig.getReader();
	const start_my = function(controller){ return mkch_on_reader_start(app, reader_orig, controller); };
	const underlying_source_my = { start: start_my, };
	const readable_stream_my = new ReadableStream(underlying_source_my);
	const options_my = { status: response_orig.status, statusText: response_orig.statusText, headers: response_orig.headers, };
	const response_my = new Response(readable_stream_my, options_my);
	const imports = { env: { js_debug_print: function(ptr, len){ mkch_print(app, ptr, len); }, }, };
	const result_object_p = WebAssembly.instantiateStreaming(response_my, imports);
	result_object_p.then( function(result_object){ mkch_on_wasm_loaded_gud(app, result_object); }, function(reason){ mkch_on_wasm_loaded_bad(app, reason); } );
}

function mkch_run(app)
{
	"use strict";
	mkch_show_msg(app, "Loading WASM...");
	const response_p = window.fetch("mk_clib_hasher.wasm");
	response_p.then( function(response){ mkch_on_wasm_gud(app, response); }, function(reason){ mkch_on_wasm_bad(app, reason); } );
}

function mkch_make()
{
	"use strict";
	const app =
	{
		m_wasm_bytes: 0,
		m_wasm_module: null,
		m_wasm_instance: null,
		m_hash_keys: [],
		m_job: null,
		m_continue: mkch_hash_continue,
	};
	return app;
}

function mkch_on_window_loaded()
{
	"use strict";
	const app = mkch_make();
	mkch_run(app);
}

function mkch_start()
{
	"use strict";
	window.addEventListener("load", mkch_on_window_loaded);
}

mkch_start();
