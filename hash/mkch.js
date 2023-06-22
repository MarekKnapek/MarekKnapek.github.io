"use strict";

let g_mkch_wi;
let g_file_state;

async function mkch_pub_load_wasm()
{
	const mkch_fp = fetch("mkch.wasm");
	const mkch_wp = WebAssembly.instantiateStreaming(mkch_fp);
	const mkch_w = await mkch_wp;
	const mkch_wi = mkch_w.instance;
	g_mkch_wi = mkch_wi;
}

function mkch_pub_buff_to_str(buff)
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

function mkch_pub_hash_compute(alg_name, alg_name_len, xof_len, data, data_len)
{
	const alg_name_addr = g_mkch_wi.exports.mkch_get_alg_name_addr();
	const alg_name_size = g_mkch_wi.exports.mkch_get_alg_name_size();
	const buffer_addr = g_mkch_wi.exports.mkch_get_buffer_addr();
	const buffer_size = g_mkch_wi.exports.mkch_get_buffer_size();
	const digest_addr = g_mkch_wi.exports.mkch_get_digest_addr();
	const digest_size = g_mkch_wi.exports.mkch_get_digest_size();
	if(!(alg_name_len >= 1 && alg_name_len <= alg_name_size))
	{
		return false;
	}
	if(!(data_len >= 0 && data_len <= buffer_size))
	{
		return false;
	}
	if(!(xof_len >= 1 && xof_len <= digest_size))
	{
		return false;
	}
	new Uint8Array(g_mkch_wi.exports.memory.buffer, alg_name_addr, alg_name_size).set(new Uint8Array(alg_name.buffer, 0, alg_name_len), 0);
	new Uint8Array(g_mkch_wi.exports.memory.buffer, buffer_addr, buffer_size).set(new Uint8Array(data.buffer, 0, data_len), 0);
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
	return mkch_pub_buff_to_str(digest_buff);
}

function mkch_pri_prepare_args()
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

function mkch_pri_onfinished(computed)
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

function mkch_pri_on_chunk_read(args, file_state, hash_state, file_pos_new, file_size, event, read_again)
{
	if(file_state.m_cancel)
	{
		file_state.m_on_done();
		return;
	}
	const chunk_data = event.target.result;
	const chunk_size = chunk_data.byteLength;
	new Uint8Array(hash_state.m_mkch_wi.exports.memory.buffer, hash_state.m_buffer_addr, hash_state.m_buffer_size).set(new Uint8Array(chunk_data, 0, chunk_size), 0);
	const appended = hash_state.m_mkch_wi.exports.mkch_append(chunk_size);
	if(appended == 0)
	{
		mkch_pri_onfinished(false);
		file_state.m_on_done();
		return;
	}
	if(file_pos_new != file_size)
	{
		const str = ((file_pos_new * 100.0) / file_size).toFixed(2) + " %";
		mkch_pri_onfinished(str);
		read_again();
	}
	else
	{
		const finished = hash_state.m_mkch_wi.exports.mkch_finish(args.m_xof_len);
		if(!(finished != 0 && (finished >= 1 && finished <= hash_state.m_digest_size)))
		{
			mkch_pri_onfinished(false);
			file_state.m_on_done();
			return;
		}
		const digest_buff = new Uint8Array(hash_state.m_mkch_wi.exports.memory.buffer, hash_state.m_digest_addr, finished);
		const digest_str = mkch_pub_buff_to_str(digest_buff);
		mkch_pri_onfinished(digest_str);
		file_state.m_on_done();
		return;
	}
}

function mkch_pri_read_chunk(args, file_state, hash_state, file, file_pos_cur, file_size)
{
	const file_rem = file_size - file_pos_cur;
	const chunk_size = Math.min(file_rem, hash_state.m_buffer_size);
	const file_pos_new = file_pos_cur + chunk_size;
	const file_slice = file.slice(file_pos_cur, file_pos_new);
	const read_again = function(){ mkch_pri_read_chunk(args, file_state, hash_state, file, file_pos_new, file_size); };
	const reader = new FileReader();
	reader.onload = function(event){ mkch_pri_on_chunk_read(args, file_state, hash_state, file_pos_new, file_size, event, read_again); };
	reader.readAsArrayBuffer(file_slice);
}

function mkch_pri_on_wasm_loaded(args, file_state, hash_state_1)
{
	const hash_state =
	{
		m_mkch_wm: hash_state_1.m_mkch_wm,
		m_mkch_wi: hash_state_1.m_mkch_wm.instance,
		m_alg_name_addr: hash_state_1.m_mkch_wm.instance.exports.mkch_get_alg_name_addr(),
		m_alg_name_size: hash_state_1.m_mkch_wm.instance.exports.mkch_get_alg_name_size(),
		m_buffer_addr: hash_state_1.m_mkch_wm.instance.exports.mkch_get_buffer_addr(),
		m_buffer_size: hash_state_1.m_mkch_wm.instance.exports.mkch_get_buffer_size(),
		m_digest_addr: hash_state_1.m_mkch_wm.instance.exports.mkch_get_digest_addr(),
		m_digest_size: hash_state_1.m_mkch_wm.instance.exports.mkch_get_digest_size(),
	};
	if(!(args.m_alg_name_len >= 1 && args.m_alg_name_len <= hash_state.m_alg_name_size))
	{
		mkch_pri_onfinished(false);
		file_state.m_on_done();
		return;
	}
	if(!(args.m_xof_len >= 1 && args.m_xof_len <= hash_state.m_digest_size))
	{
		mkch_pri_onfinished(false);
		file_state.m_on_done();
		return;
	}
	new Uint8Array(hash_state.m_mkch_wi.exports.memory.buffer, hash_state.m_alg_name_addr, hash_state.m_alg_name_size).set(new Uint8Array(args.m_alg_name.buffer, 0, args.m_alg_name_len), 0);
	const inited = hash_state.m_mkch_wi.exports.mkch_init(args.m_alg_name_len);
	if(inited == 0)
	{
		mkch_pri_onfinished(false);
		file_state.m_on_done();
		return;
	}
	const file = args.m_filee.files[0];
	const file_size = file.size;
	const file_pos_cur = 0;
	mkch_pri_read_chunk(args, file_state, hash_state, file, file_pos_cur, file_size);
}

function mkch_pri_hash_refresh(args, file_state)
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
		const text = document.getElementById("text").value;
		const data = new Uint8Array(text.length * 3);
		const data_len = new TextEncoder().encodeInto(text, data).written;
		const computed = mkch_pub_hash_compute(args.m_alg_name, args.m_alg_name_len, args.m_xof_len, data, data_len);
		mkch_pri_onfinished(computed);
		file_state.m_on_done();
	}
	else
	{
		const mkch_fp = fetch("mkch.wasm");
		const mkch_wp = WebAssembly.instantiateStreaming(mkch_fp);
		mkch_wp.then( function(mkch_wm){ const hash_state = { m_mkch_wm: mkch_wm, }; mkch_pri_on_wasm_loaded(args, file_state, hash_state); } );
	}
}

function mkch_pub_hash_refresh()
{
	const args = mkch_pri_prepare_args();
	const file_state_new =
	{
		m_cancel: false,
		next: null,
		m_on_done: function(){ const fn = file_state_new.m_next; if(fn){ fn(); }else{ g_file_state = null; } },
	};
	if(!g_file_state)
	{
		g_file_state = file_state_new;
		mkch_pri_hash_refresh(args, file_state_new);
	}
	else
	{
		g_file_state.m_next = function(){ mkch_pri_hash_refresh(args, file_state_new); };
		g_file_state.m_cancel = true;
		g_file_state = file_state_new;
	}
}

function mkch_pub_form_onsubmit()
{
	mkch_pub_hash_refresh();
	return false;
}

function mkch_pub_text_oninput()
{
	document.getElementById("file").value = null;
	mkch_pub_hash_refresh();
}

function mkch_pub_file_onchange()
{
	mkch_pub_hash_refresh();
}

function mkch_pub_alg_onchange()
{
	mkch_pub_hash_refresh();
}

function mkch_pub_length_onchange()
{
	mkch_pub_hash_refresh();
}

mkch_pub_load_wasm();
