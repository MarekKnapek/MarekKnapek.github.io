"use strict";

function mkch_app_show_msg(app, msg)
{
	"use strict";
	document.getElementById("msg").textContent = msg;
}

function mkch_app_show_err_msg(app, msg)
{
	"use strict";
	const message = `Error! ${msg}`;
	mkch_app_show_msg(app, message);
}

function mkch_app_show_err_reason(app, reason, msg)
{
	"use strict";
	const message = `Message: ${msg} Reason: ${reason}.`;
	mkch_app_show_err_msg(app, message);
}

function mkch_app_wasm_call_generic(app, fnc, arg)
{
	"use strict";
	const res = app.m_wasm_instance.exports.majn(fnc, arg);
	return res;
}

function mkch_app_wasm_call_get_buffer_buf(app)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 0, 0);
	return res;
}

function mkch_app_wasm_call_get_buffer_len(app)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 1, 0);
	return res;
}

function mkch_app_wasm_call_get_alg_count(app)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 2, 0);
	return res;
}

function mkch_app_wasm_call_get_default_alg(app)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 3, 0);
	return res;
}

function mkch_app_wasm_call_get_alg_str_buf(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 4, arg);
	return res;
}

function mkch_app_wasm_call_get_alg_str_len(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 5, arg);
	return res;
}

function mkch_app_wasm_call_get_alg_key_buf(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 6, arg);
	return res;
}

function mkch_app_wasm_call_get_alg_key_len(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 7, arg);
	return res;
}

function mkch_app_wasm_call_get_digest_len(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 8, arg);
	return res;
}

function mkch_app_wasm_call_init(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 9, arg);
	return res;
}

function mkch_app_wasm_call_append(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 10, arg);
	return res;
}

function mkch_app_wasm_call_finish(app, arg)
{
	"use strict";
	const res = mkch_app_wasm_call_generic(app, 11, arg);
	return res;
}

function mkch_util_is_integer_non_negative(x)
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

function mkch_util_is_integer_positive(x)
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

function mkch_util_buf_to_str(buf)
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

function mkch_util_sub_block(block, off, len)
{
	"use strict";
	console.assert(block instanceof Uint8Array);
	console.assert(mkch_util_is_integer_non_negative(off));
	console.assert(mkch_util_is_integer_positive(len));
	console.assert(block.byteLength > off);
	console.assert(block.byteLength >= off + len);
	const sub = new Uint8Array(block.buffer, block.byteOffset + off, len);
	return sub;
}

function mkch_util_memcpy(dst_buff, dst_off, src_buff, src_off, amount)
{
	"use strict";
	console.assert(dst_buff instanceof Uint8Array);
	console.assert(mkch_util_is_integer_non_negative(dst_off));
	console.assert(src_buff instanceof Uint8Array);
	console.assert(mkch_util_is_integer_non_negative(src_off));
	console.assert(mkch_util_is_integer_positive(amount));
	console.assert(dst_buff.byteLength > dst_off);
	console.assert(dst_buff.byteLength >= dst_off + amount);
	console.assert(src_buff.byteLength > src_off);
	console.assert(src_buff.byteLength >= src_off + amount);
	const dst_tmp = mkch_util_sub_block(dst_buff, dst_off, amount);
	const src_tmp = mkch_util_sub_block(src_buff, src_off, amount);
	dst_tmp.set(src_tmp, 0);
}

function mkch_app_get_mem(app, off, len)
{
	"use strict";
	const buf = new Uint8Array(app.m_wasm_instance.exports.memory.buffer, off, len);;
	return buf;
}

function mkch_app_get_buf(app)
{
	"use strict";
	const off = mkch_app_wasm_call_get_buffer_buf(app);
	const len = mkch_app_wasm_call_get_buffer_len(app);
	const buf = mkch_app_get_mem(app, off, len);
	return buf;
}

function mkch_job_progress(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	const app = job.m_app;
	if(job.m_file_finished === job.m_file_size)
	{
		const finished = mkch_app_wasm_call_finish(app, job.m_args.m_xof_len);
		console.assert(finished === 0);
		const digest_len = mkch_app_wasm_call_get_digest_len(app, job.m_args.m_alg_idx);
		const out_len = digest_len == 0 ? job.m_args.m_xof_len : digest_len;
		const digest_buf = mkch_util_sub_block(mkch_app_get_buf(app), 0, out_len);
		const digest_str = mkch_util_buf_to_str(digest_buf);
		document.getElementById("resultb").textContent = digest_str;
		app.m_job = job.m_next;
	}
	else
	{
		const percent = ((job.m_file_finished * 100.0) / job.m_file_size).toFixed(2) + " %";
		document.getElementById("resultb").textContent = percent;
	}
}

function mkch_job_on_chunk_read_finished(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	const app = job.m_app;
	for(;;)
	{
		if(job.m_file_iorps.length === 0)
		{
			break;
		}
		const iorp = job.m_file_iorps[0];
		if(iorp.m_event === null)
		{
			break;
		}
		const chunk_data = new Uint8Array(iorp.m_event.target.result);
		const chunk_size = chunk_data.byteLength;
		const mem = mkch_app_get_buf(app);
		mkch_util_memcpy(mem, 0, chunk_data, 0, chunk_size);
		const appended = mkch_app_wasm_call_append(app, chunk_size);
		console.assert(appended === 0);
		job.m_file_finished += chunk_size;
		job.m_file_iorps.shift();
	}
	mkch_job_progress(job);
	job.m_file_step = 2;
	app.m_continue(app);
}

function mkch_job_on_slice_loaded(job, iorp, event)
{
	"use strict";
	if(job.m_app.m_job === job)
	{
		const app = job.m_app;
		iorp.m_event = event;
		job.m_file_step = 1;
		app.m_continue(app);
	}
}

function mkch_app_make_iorp(app)
{
	"use strict";
	const iorp =
	{
		m_event: null,
	};
	return iorp;
}

function mkch_job_request_chunks(job)
{
	"use strict";
	if(job.m_app.m_job === job)
	{
		const app = job.m_app;
		const iorps_max_count = 32;
		while(job.m_file_iorps.length < iorps_max_count)
		{
			const rem = job.m_file_size - job.m_file_cur;
			if(rem === 0)
			{
				break;
			}
			const page_size = 64 * 1024;
			const slice_size = Math.min(rem, page_size);
			const beg = job.m_file_cur;
			const end = beg + slice_size;
			const slice_obj = job.m_file_obj.slice(beg, end);
			job.m_file_cur += slice_size;
			const iorp = mkch_app_make_iorp(app);
			job.m_file_iorps.push(iorp);
			const reader = new FileReader();
			reader.onload = function(event){ mkch_job_on_slice_loaded(job, iorp, event); };
			reader.readAsArrayBuffer(slice_obj);
		}
	}
}

function mkch_job_open_file(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	const app = job.m_app;
	document.getElementById("lengthl").hidden = !job.m_args.m_is_xof;
	document.getElementById("length").hidden = !job.m_args.m_is_xof;
	document.getElementById("resulta").textContent = job.m_args.m_alg_str;
	document.getElementById("resultb").textContent = "Starting...";
	document.getElementById("resulto").hidden = false;
	const inited = mkch_app_wasm_call_init(app, job.m_args.m_alg_idx);
	console.assert(inited === 0);
	const file_obj = job.m_args.m_filee.files[0];
	const file_size = file_obj.size;
	job.m_file_obj = file_obj;
	job.m_file_size = file_size;
	mkch_job_request_chunks(job);
}

function mkch_job_file(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	const file_step = job.m_file_step;
	switch(file_step)
	{
		case 0: mkch_job_open_file(job); break;
		case 1: mkch_job_on_chunk_read_finished(job); break;
		case 2: mkch_job_request_chunks(job); break;
		default: console.assert(false); break;
	}
}

function mkch_job_compute_text(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	const app = job.m_app;
	const buffer_buf = mkch_app_wasm_call_get_buffer_buf(app);
	const buffer_len = mkch_app_wasm_call_get_buffer_len(app);
	console.assert(buffer_buf != 0);
	console.assert(buffer_len >= 64 * 1024);
	const text_len = job.m_args.m_text_buf === null ? 0 : job.m_args.m_text_buf.byteLength;
	console.assert(text_len <= buffer_len);
	console.assert(job.m_args.m_xof_len <= buffer_len);
	const digest_len = mkch_app_wasm_call_get_digest_len(app, job.m_args.m_alg_idx);
	console.assert(digest_len == 0 || (digest_len >= 16 && digest_len <= 64));
	const inited = mkch_app_wasm_call_init(app, job.m_args.m_alg_idx);
	console.assert(inited === 0);
	const mem = mkch_app_get_buf(app);
	if(text_len != 0)
	{
		mkch_util_memcpy(mem, 0, job.m_args.m_text_buf, 0, job.m_args.m_text_buf.byteLength);
	}
	const appended = mkch_app_wasm_call_append(app, text_len);
	console.assert(appended === 0);
	const finished = mkch_app_wasm_call_finish(app, job.m_args.m_xof_len);
	console.assert(finished === 0);
	const digest_buf = mkch_app_get_mem(app, buffer_buf, digest_len == 0 ? job.m_args.m_xof_len : digest_len);
	const digest_str = mkch_util_buf_to_str(digest_buf);
	return digest_str;
}

function mkch_job_text(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	const app = job.m_app;
	const digest = mkch_job_compute_text(job);
	document.getElementById("lengthl").hidden = !job.m_args.m_is_xof;
	document.getElementById("length").hidden = !job.m_args.m_is_xof;
	document.getElementById("resulta").textContent = job.m_args.m_alg_str;
	document.getElementById("resultb").textContent = digest;
	document.getElementById("resulto").hidden = false;
	app.m_job = app.m_job.m_next;
	app.m_continue(app);
}

function mkch_job_continue(job)
{
	"use strict";
	console.assert(job.m_app.m_job === job);
	if(job.m_args.m_is_file === false)
	{
		mkch_job_text(job);
	}
	else
	{
		mkch_job_file(job);
	}
}

function mkch_app_drain(app)
{
	"use strict";
	while(app.m_job !== null && app.m_job.m_next !== null)
	{
		app.m_job = app.m_job.m_next;
	}
}

function mkch_app_continue(app)
{
	"use strict";
	mkch_app_drain(app);
	const job = app.m_job;
	if(job !== null)
	{
		mkch_job_continue(job);
	}
}

function mkch_app_make_job(app)
{
	"use strict";
	const job =
	{
		m_app: app,
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

function mkch_app_prepare_args(app)
{
	"use strict";
	const texte = document.getElementById("text").value;
	const text_storage = new Uint8Array(texte.length * 3);
	const text_len = new TextEncoder().encodeInto(texte, text_storage).written;
	const text_buf = text_len == 0 ? null : mkch_util_sub_block(text_storage, 0, text_len);
	const filee = document.getElementById("file");
	const is_file = filee.value != "";
	const alge = document.getElementById("alg");
	const alg_idx = parseInt(alge.value, 10);
	console.assert(mkch_util_is_integer_non_negative(alg_idx));
	const digest_len = mkch_app_wasm_call_get_digest_len(app, alg_idx);
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

function mkch_app_refresh(app)
{
	"use strict";
	const args = mkch_app_prepare_args(app);
	const job = mkch_app_make_job(app);
	job.m_args = args;
	if(app.m_job === null)
	{
		app.m_job = job;
		mkch_app_continue(app);
	}
	else
	{
		app.m_job.m_next = job;
	}
}

function mkch_app_on_form_submit(app, event)
{
	"use strict";
	mkch_app_refresh(app);
	return false;
}

function mkch_app_on_text_input(app, event)
{
	"use strict";
	document.getElementById("file").value = null;
	mkch_app_refresh(app);
}

function mkch_app_on_file_change(app, event)
{
	"use strict";
	mkch_app_refresh(app);
}

function mkch_app_on_alg_change(app, event)
{
	"use strict";
	mkch_app_refresh(app);
}

function mkch_app_on_length_change(app, event)
{
	"use strict";
	mkch_app_refresh(app);
}

function mkch_app_parse_url_fragment_query(app)
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
						arr.push({ m_key: key, m_val: val, });
					}
					else
					{
						const val = f;
						arr.push({ m_key: key, m_val: val, });
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

function mkch_app_parse_url(app)
{
	"use strict";
	let want_refresh = false;
	const keyvals = mkch_app_parse_url_fragment_query(app);
	if(keyvals.length >= 1 && keyvals[0].m_key == "h")
	{
		const val_a = keyvals[0].m_val;
		const val_b = val_a.replace("-", "_");
		let idx = 0;
		for(const key_arr of app.m_hash_keys)
		{
			const key = new TextDecoder().decode(key_arr).toLowerCase();
			if(val_a === key || val_b === key)
			{
				const alge = document.getElementById("alg");
				alge.value = idx.toString();
				want_refresh = true;
				break;
			}
			++idx;
		}
	}
	let hast = false;
	let t;
	if(keyvals.length == 1 && keyvals[0].m_key == "t")
	{
		t = keyvals[0].m_val;
		hast = true;
	}
	else if(keyvals.length == 2 && keyvals[1].m_key == "t")
	{
		t = keyvals[1].m_val;
		hast = true;
	}
	if(hast)
	{
		const texte = document.getElementById("text");
		texte.value = t;
		want_refresh = true;
	}
	if(want_refresh)
	{
		mkch_app_refresh(app);
	}
}

function mkch_app_populate_events(app)
{
	"use strict";
	const form = document.getElementById("form");
	const text = document.getElementById("text");
	const file = document.getElementById("file");
	const alge = document.getElementById("alg");
	const length = document.getElementById("length");
	form.addEventListener("submit", function(event){ mkch_app_on_form_submit(app, event); } );
	text.addEventListener("input", function(event){ mkch_app_on_text_input(app, event); } );
	file.addEventListener("change", function(event){ mkch_app_on_file_change(app, event); } );
	alge.addEventListener("change", function(event){ mkch_app_on_alg_change(app, event); } );
	length.addEventListener("change", function(event){ mkch_app_on_length_change(app, event); } );
}

function mkch_app_populate_algs(app)
{
	"use strict";
	const alge = document.getElementById("alg");
	const alg_count = mkch_app_wasm_call_get_alg_count(app);
	for(let i = 0; i != alg_count; ++i)
	{
		const str_buf = mkch_app_wasm_call_get_alg_str_buf(app, i);
		const str_len = mkch_app_wasm_call_get_alg_str_len(app, i);
		const str_arr = mkch_app_get_mem(app, str_buf, str_len);
		const str_obj = new TextDecoder().decode(str_arr);
		const algi = new Option(str_obj, i.toString());
		alge.add(algi, undefined);
		const key_buf = mkch_app_wasm_call_get_alg_key_buf(app, i);
		const key_len = mkch_app_wasm_call_get_alg_key_len(app, i);
		const key_arr = mkch_app_get_mem(app, key_buf, key_len);
		app.m_hash_keys.push(key_arr);
	}
	const default_alg = mkch_app_wasm_call_get_default_alg(app);
	alge.selectedIndex = default_alg;
}

function mkch_app_on_wasm_loaded_gud(app, result_object)
{
	"use strict";
	app.m_wasm_module = result_object.module;
	app.m_wasm_instance = result_object.instance;
	mkch_app_show_msg(app, "");
	mkch_app_populate_algs(app);
	mkch_app_populate_events(app);
	mkch_app_parse_url(app);
}

function mkch_app_on_wasm_loaded_bad(app, reason)
{
	"use strict";
	mkch_app_show_err_reason(app, reason, "Failed to instanciate WASM module.");
}

function mkch_app_on_chunk_done_bad(app, reason)
{
	"use strict";
	mkch_app_show_err_reason(app, reason, "Input stream became errored.");
}

function mkch_app_on_chunk_done_gud(app, reader, controller, self, chunk_done)
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
	mkch_app_show_msg(app, msg);
	controller.enqueue(chunk);
	const chunk_done_p = reader.read();
	chunk_done_p.then( function(chunk_done){ self(app, reader, controller, self, chunk_done); }, function(reason){ mkch_app_on_chunk_done_bad(app, reason); } );
}

function mkch_app_on_reader_start(app, reader, controller)
{
	"use strict";
	const chunk_done_p = reader.read();
	chunk_done_p.then( function(chunk_done){ mkch_app_on_chunk_done_gud(app, reader, controller, mkch_app_on_chunk_done_gud, chunk_done); }, function(reason){ mkch_app_on_chunk_done_bad(app, reason); } );
}

function mkch_app_print(app, ptr, len)
{
	"use strict";
	const str_arr = mkch_app_get_mem(app, ptr, len);
	const str_obj = new TextDecoder().decode(str_arr);
	mkch_app_show_msg(app, str_obj);
}

function mkch_app_on_wasm_fetch_gud(app, response)
{
	"use strict";
	if(!response.ok)
	{
		mkch_app_show_err_msg(app, "Failed to get WASM module.");
		return;
	}
	const readable_stream_orig = response.body;
	if(readable_stream_orig === null)
	{
		mkch_app_show_err_msg(app, "WASM response has no body.");
		return;
	}
	const response_orig = response;
	const reader_orig = readable_stream_orig.getReader();
	const underlying_source_my = { start: function(controller){ return mkch_app_on_reader_start(app, reader_orig, controller); }, };
	const readable_stream_my = new ReadableStream(underlying_source_my);
	const options_my = { status: response_orig.status, statusText: response_orig.statusText, headers: response_orig.headers, };
	const response_my = new Response(readable_stream_my, options_my);
	const imports = { env: { js_debug_print: function(ptr, len){ mkch_app_print(app, ptr, len); }, }, };
	const result_object_p = WebAssembly.instantiateStreaming(response_my, imports);
	result_object_p.then( function(result_object){ mkch_app_on_wasm_loaded_gud(app, result_object); }, function(reason){ mkch_app_on_wasm_loaded_bad(app, reason); } );
}

function mkch_app_on_wasm_fetch_bad(app, reason)
{
	"use strict";
	mkch_app_show_err_reason(app, reason, "Failed to fetch WASM module.");
}

function mkch_app_run(app)
{
	"use strict";
	mkch_app_show_msg(app, "Loading WASM...");
	const response_p = window.fetch("mk_clib_hasher.wasm");
	response_p.then( function(response){ mkch_app_on_wasm_fetch_gud(app, response); }, function(reason){ mkch_app_on_wasm_fetch_bad(app, reason); } );
}

function mkch_g_make_app()
{
	"use strict";
	const app =
	{
		m_wasm_bytes: 0,
		m_wasm_module: null,
		m_wasm_instance: null,
		m_hash_keys: [],
		m_job: null,
		m_continue: mkch_app_continue,
	};
	return app;
}

function mkch_g_on_window_loaded()
{
	"use strict";
	const app = mkch_g_make_app();
	mkch_app_run(app);
}

function mkch_g_start()
{
	"use strict";
	window.addEventListener("load", mkch_g_on_window_loaded);
}

mkch_g_start();
