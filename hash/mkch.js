"use strict";

let g_mkch_wi;
let g_file_state;

function mkch_onfinished(computed)
{
	if(computed == false)
	{
		document.getElementById("resulto").hidden = true;
	}
	else
	{
		document.getElementById("resultb").textContent = computed;
		document.getElementById("resulto").hidden = false;
	}
}

function mkch_buff_to_str(buff)
{
	const alphabet = "0123456789abcdef";
	const n = buff.byteLength;
	const digest_str = new Uint8Array(n * 2);
	for(let i = 0; i != n; ++i)
	{
		const b = buff[i] & 0xff;
		const hi = (b >> 4) & 0xf;
		const lo = (b >> 0) & 0xf;
		digest_str[i * 2 + 0] = alphabet.codePointAt(hi);
		digest_str[i * 2 + 1] = alphabet.codePointAt(lo);
	}
	return new TextDecoder().decode(digest_str);
}

function mkch_on_chunk_read(args, file_state, hash_state, file_pos_new, file_size, event, read_again)
{
	if(file_state.m_cancel)
	{
		file_state.m_on_done();
		return;
	}
	const chunk_data = event.target.result;
	const chunk_size = chunk_data.byteLength;
	new Uint8Array(g_mkch_wi.exports.memory.buffer, hash_state.m_msg_addr, hash_state.m_msg_size).set(new Uint8Array(chunk_data, 0, chunk_size), 0);
	const appended = g_mkch_wi.exports.mkch_append(chunk_size);
	if(appended == 0)
	{
		mkch_onfinished(false);
		file_state.m_on_done();
		return;
	}
	if(file_pos_new != file_size)
	{
		const str = ((file_pos_new * 100.0) / file_size).toFixed(2) + " %";
		mkch_onfinished(str);
		read_again();
	}
	else
	{
		const finished = g_mkch_wi.exports.mkch_finish(args.m_xof_len);
		if(!(finished != 0 && (finished >= 1 && finished <= hash_state.m_digest_size)))
		{
			mkch_onfinished(false);
			file_state.m_on_done();
			return;
		}
		const digest_buff = new Uint8Array(g_mkch_wi.exports.memory.buffer, hash_state.m_digest_addr, finished);
		const digest_str = mkch_buff_to_str(digest_buff);
		mkch_onfinished(digest_str);
		file_state.m_on_done();
		return;
	}
}

function mkch_read_chunk(args, file_state, hash_state, file, file_pos_cur, file_size, self)
{
	const file_rem = file_size - file_pos_cur;
	const chunk_size = Math.min(file_rem, hash_state.m_msg_size);
	const file_pos_new = file_pos_cur + chunk_size;
	const file_slice = file.slice(file_pos_cur, file_pos_new);
	const read_again = function(){ self(args, file_state, hash_state, file, file_pos_new, file_size, self); };
	const reader = new FileReader();
	reader.onload = function(event){ mkch_on_chunk_read(args, file_state, hash_state, file_pos_new, file_size, event, read_again); };
	reader.readAsArrayBuffer(file_slice);
}

function mkch_hash_refresh_impl_file(args, file_state)
{
	const hash_state =
	{
		m_alg_name_addr: g_mkch_wi.exports.mkch_get_alg_name_addr(),
		m_alg_name_size: g_mkch_wi.exports.mkch_get_alg_name_size(),
		m_msg_addr: g_mkch_wi.exports.mkch_get_msg_addr(),
		m_msg_size: g_mkch_wi.exports.mkch_get_msg_size(),
		m_digest_addr: g_mkch_wi.exports.mkch_get_digest_addr(),
		m_digest_size: g_mkch_wi.exports.mkch_get_digest_size(),
	};
	if(!(args.m_alg_name_len >= 1 && args.m_alg_name_len <= hash_state.m_alg_name_size))
	{
		mkch_onfinished(false);
		file_state.m_on_done();
		return;
	}
	if(!(args.m_xof_len >= 1 && args.m_xof_len <= hash_state.m_digest_size))
	{
		mkch_onfinished(false);
		file_state.m_on_done();
		return;
	}
	new Uint8Array(g_mkch_wi.exports.memory.buffer, hash_state.m_alg_name_addr, hash_state.m_alg_name_size).set(new Uint8Array(args.m_alg_name.buffer, 0, args.m_alg_name_len), 0);
	const inited = g_mkch_wi.exports.mkch_init(args.m_alg_name_len);
	if(inited == 0)
	{
		mkch_onfinished(false);
		file_state.m_on_done();
		return;
	}
	const file = args.m_filee.files[0];
	const file_size = file.size;
	const file_pos_cur = 0;
	mkch_read_chunk(args, file_state, hash_state, file, file_pos_cur, file_size, mkch_read_chunk);
}

function mkch_hash_compute(alg_name, alg_name_len, xof_len, data, data_len)
{
	const alg_name_addr = g_mkch_wi.exports.mkch_get_alg_name_addr();
	const alg_name_size = g_mkch_wi.exports.mkch_get_alg_name_size();
	const msg_addr = g_mkch_wi.exports.mkch_get_msg_addr();
	const msg_size = g_mkch_wi.exports.mkch_get_msg_size();
	const digest_addr = g_mkch_wi.exports.mkch_get_digest_addr();
	const digest_size = g_mkch_wi.exports.mkch_get_digest_size();
	if(!(alg_name_len >= 1 && alg_name_len <= alg_name_size))
	{
		return false;
	}
	if(!(data_len >= 0 && data_len <= msg_size))
	{
		return false;
	}
	if(!(xof_len >= 1 && xof_len <= digest_size))
	{
		return false;
	}
	new Uint8Array(g_mkch_wi.exports.memory.buffer, alg_name_addr, alg_name_size).set(new Uint8Array(alg_name.buffer, 0, alg_name_len), 0);
	new Uint8Array(g_mkch_wi.exports.memory.buffer, msg_addr, msg_size).set(new Uint8Array(data.buffer, 0, data_len), 0);
	const mkch_ret = g_mkch_wi.exports.mkch(alg_name_len, data_len, xof_len);
	if(mkch_ret == 0)
	{
		return false;
	}
	if(!(mkch_ret >= 1 && mkch_ret <= digest_size))
	{
		return false;
	}
	const digest_buff = new Uint8Array(g_mkch_wi.exports.memory.buffer, digest_addr, mkch_ret);
	return mkch_buff_to_str(digest_buff);
}

function mkch_hash_refresh_impl_text(args, file_state)
{
	const text = document.getElementById("text").value;
	const data = new Uint8Array(text.length * 3);
	const data_len = new TextEncoder().encodeInto(text, data).written;
	const computed = mkch_hash_compute(args.m_alg_name, args.m_alg_name_len, args.m_xof_len, data, data_len);
	mkch_onfinished(computed);
	file_state.m_on_done();
}

function mkch_hash_refresh_impl_both(args, file_state)
{
	if(file_state.m_cancel)
	{
		file_state.m_on_done();
		return;
	}
	document.getElementById("lengthl").hidden = !args.m_is_xof;
	document.getElementById("length").hidden = !args.m_is_xof;
	document.getElementById("resulta").textContent = args.m_alg_str;
	if(!args.m_is_file)
	{
		mkch_hash_refresh_impl_text(args, file_state);
	}
	else
	{
		mkch_hash_refresh_impl_file(args, file_state);
	}
}

function mkch_on_done(file_state)
{
	const fn = file_state.m_next;
	if(fn)
	{
		fn();
	}
	else
	{
		g_file_state = null;
	}
}

function mkch_prepare_args()
{
	const filee = document.getElementById("file");
	const is_file = filee.value != "";
	const alge = document.getElementById("alg");
	const alg_name = new Uint8Array(0xff);
	const alg_name_len = new TextEncoder().encodeInto(alge.value, alg_name).written;
	const is_xof = alge.value == "shake_128" || alge.value == "shake_256";
	const xof_len_base = 64;
	let xof_len_;
	xof_len_ = document.getElementById("length").value;
	xof_len_ = parseInt(xof_len_, 10);
	xof_len_ = Number.isNaN(xof_len_) ? xof_len_base : xof_len_;
	xof_len_ = xof_len_ <= 0 ? xof_len_base : xof_len_;
	xof_len_ = xof_len_ > 16 * 1024 ? xof_len_base : xof_len_;
	const xof_len = xof_len_;
	const alg_str_base = alge.options[alge.selectedIndex].textContent;
	const alg_str = ((is_file) ? ("File ") : ("")) + alg_str_base + ((is_xof) ? ("(" + (xof_len * 8) + ")") : (""));
	const args =
	{
		m_filee: filee,
		m_is_file: is_file,
		m_alg_name: alg_name,
		m_alg_name_len: alg_name_len,
		m_is_xof: is_xof,
		m_xof_len: xof_len,
		m_alg_str: alg_str,
	};
	return args;
}

function mkch_hash_refresh()
{
	const args = mkch_prepare_args();
	let file_state_new =
	{
		m_cancel: false,
		next: null,
		m_on_done: null,
	};
	const on_done = function(){ mkch_on_done(file_state_new); };
	file_state_new.m_on_done = on_done;
	if(!g_file_state)
	{
		g_file_state = file_state_new;
		mkch_hash_refresh_impl_both(args, file_state_new);
	}
	else
	{
		g_file_state.m_next = function(){ mkch_hash_refresh_impl_both(args, file_state_new); };
		g_file_state.m_cancel = true;
		g_file_state = file_state_new;
	}
}

function mkch_length_onchange()
{
	mkch_hash_refresh();
}

function mkch_alg_onchange()
{
	mkch_hash_refresh();
}

function mkch_file_onchange()
{
	mkch_hash_refresh();
}

function mkch_text_oninput()
{
	document.getElementById("file").value = null;
	mkch_hash_refresh();
}

function mkch_form_onsubmit()
{
	mkch_hash_refresh();
	return false;
}

function mkch_populate_events()
{
	const form = document.getElementById("form");
	const text = document.getElementById("text");
	const file = document.getElementById("file");
	const alge = document.getElementById("alg");
	const length = document.getElementById("length");
	form.addEventListener("submit", mkch_form_onsubmit);
	text.addEventListener("input", mkch_text_oninput);
	file.addEventListener("change", mkch_file_onchange);
	alge.addEventListener("change", mkch_alg_onchange);
	length.addEventListener("change", mkch_length_onchange);
}

function mkch_populate_algs()
{
	let names = [];
	const alg_name_addr = g_mkch_wi.exports.mkch_get_alg_name_addr();
	const alg_name_size = g_mkch_wi.exports.mkch_get_alg_name_size();
	const alg_count = g_mkch_wi.exports.mkch_get_alg_count();
	if(alg_count == 0)
	{
		return;
	}
	for(let i = 0; i != alg_count; ++i)
	{
		const alg_name_len = g_mkch_wi.exports.mkch_get_alg_name(i);
		if(alg_name_len == 0)
		{
			return;
		}
		const alg_name = new TextDecoder().decode(new Uint8Array(g_mkch_wi.exports.memory.buffer, alg_name_addr, alg_name_len));
		const alg_pretty_name_len = g_mkch_wi.exports.mkch_get_alg_pretty_name(i);
		if(alg_pretty_name_len == 0)
		{
			return;
		}
		const alg_pretty_name = new TextDecoder().decode(new Uint8Array(g_mkch_wi.exports.memory.buffer, alg_name_addr, alg_pretty_name_len));
		names[i * 2 + 0] = alg_name;
		names[i * 2 + 1] = alg_pretty_name;
	}
	const alge = document.getElementById("alg");
	for(let i = 0; i != alg_count; ++i)
	{
		const alg_name = names[i * 2 + 0];
		const alg_pretty_name = names[i * 2 + 1];
		const algi = new Option(alg_pretty_name, alg_name);
		alge.add(algi, undefined);
	}
}

function mkch_on_wasm_loaded(mkch_wm)
{
	const mkch_wi = mkch_wm.instance;
	g_mkch_wi = mkch_wi;
	mkch_populate_algs();
	mkch_populate_events();
}

function mkch_load_wasm()
{
	const mkch_fp = fetch("mkch.wasm");
	const mkch_wp = WebAssembly.instantiateStreaming(mkch_fp);
	mkch_wp.then(mkch_on_wasm_loaded);
}

function mkch_start()
{
	window.onload = mkch_load_wasm;
}

mkch_start();
