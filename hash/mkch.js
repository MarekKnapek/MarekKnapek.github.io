"use strict";

let mkch_g_wi;
let mkch_g_file_state;

function mkch_is_integer_non_negative(x)
{
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
	let gud = true;
	gud = gud && typeof x === "number";
	gud = gud && isFinite(x);
	gud = gud && Math.round(x) == x;
	gud = gud && x >= 1;
	gud = gud && x <= 2 * 1024 * 1024;
	return gud;
}

function mkch_sub_block(block, off, len)
{
	console.assert(block instanceof Uint8Array);
	console.assert(mkch_is_integer_non_negative(off));
	console.assert(mkch_is_integer_positive(len));
	console.assert(block.byteLength > off);
	console.assert(block.byteLength >= off + len);

	const sub = new Uint8Array(block.buffer, block.byteOffset + off, len);
	return sub;
}

function mkch_memcpy_impl(dst_buff, dst_off, src_buff, src_off, amount)
{
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

function mkch_block_from_memory(memory)
{
	console.assert(memory instanceof WebAssembly.Memory);

	const block = new Uint8Array(memory.buffer, 0, memory.buffer.byteLength);
	return block;
}

function mkch_memcpy(dst_buff, dst_off, src_buff, src_off, amount)
{
	console.assert(dst_buff instanceof Uint8Array || dst_buff instanceof WebAssembly.Memory);
	console.assert(mkch_is_integer_non_negative(dst_off));
	console.assert(src_buff instanceof Uint8Array || src_buff instanceof WebAssembly.Memory);
	console.assert(mkch_is_integer_non_negative(src_off));
	console.assert(mkch_is_integer_positive(amount));
	console.assert(!(dst_buff instanceof WebAssembly.Memory && src_buff instanceof WebAssembly.Memory));

	if(dst_buff instanceof WebAssembly.Memory)
	{
		const dst_tmp = mkch_block_from_memory(dst_buff);
		mkch_memcpy_impl(dst_tmp, dst_off, src_buff, src_off, amount);
	}
	else if(src_buff instanceof WebAssembly.Memory)
	{
		const src_tmp = mkch_block_from_memory(src_buff);
		mkch_memcpy_impl(dst_buff, dst_off, src_tmp, src_off, amount);
	}
	else
	{
		mkch_memcpy_impl(dst_buff, dst_off, src_buff, src_off, amount);
	}
}

function mkch_on_finished(computed)
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
	const mem = mkch_sub_block(mkch_block_from_memory(mkch_g_wi.exports.memory), hash_state.m_buffer_buf, hash_state.m_buffer_len);
	const dat = mkch_sub_block(new Uint8Array(chunk_data), 0, chunk_size);
	mkch_memcpy(mem, 0, dat, 0, chunk_size);
	const appended = mkch_g_wi.exports.mk_clib_hasher_append(chunk_size);
	if(appended != 0)
	{
		mkch_on_finished(false);
		file_state.m_on_done();
		return;
	}
	if(file_pos_new != file_size)
	{
		const str = ((file_pos_new * 100.0) / file_size).toFixed(2) + " %";
		mkch_on_finished(str);
		read_again();
	}
	else
	{
		const finished = mkch_g_wi.exports.mk_clib_hasher_finish(args.m_xof_len);
		if(finished != 0)
		{
			mkch_on_finished(false);
			file_state.m_on_done();
			return;
		}
		const digest_len = mkch_g_wi.exports.mk_clib_hasher_get_digest_len(args.m_alg_idx);
		if(!(digest_len == 0 || (digest_len >= 16 && digest_len <= 64)))
		{
			return false;
		}
		const digest_buf = mkch_sub_block(mkch_block_from_memory(mkch_g_wi.exports.memory), hash_state.m_buffer_buf, digest_len == 0 ? args.m_xof_len : digest_len);
		const digest_str = mkch_buff_to_str(digest_buf);
		mkch_on_finished(digest_str);
		file_state.m_on_done();
		return;
	}
}

function mkch_read_chunk(args, file_state, hash_state, file, file_pos_cur, file_size, self)
{
	const file_rem = file_size - file_pos_cur;
	const chunk_size = Math.min(file_rem, hash_state.m_buffer_len);
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
		m_buffer_buf: mkch_g_wi.exports.mk_clib_hasher_get_buffer_buf(),
		m_buffer_len: mkch_g_wi.exports.mk_clib_hasher_get_buffer_len(),
	};
	const inited = mkch_g_wi.exports.mk_clib_hasher_init(args.m_alg_idx);
	if(inited != 0)
	{
		mkch_on_finished(false);
		file_state.m_on_done();
		return;
	}
	const file = args.m_filee.files[0];
	const file_size = file.size;
	const file_pos_cur = 0;
	mkch_read_chunk(args, file_state, hash_state, file, file_pos_cur, file_size, mkch_read_chunk);
}

function mkch_hash_compute(alg_idx, xof_len, data, data_len)
{
	const buffer_buf = mkch_g_wi.exports.mk_clib_hasher_get_buffer_buf();
	const buffer_len = mkch_g_wi.exports.mk_clib_hasher_get_buffer_len();
	if(!(data_len >= 0 && data_len <= buffer_len))
	{
		return false;
	}
	if(!(xof_len >= 1 && xof_len <= buffer_len))
	{
		return false;
	}
	const digest_len = mkch_g_wi.exports.mk_clib_hasher_get_digest_len(alg_idx);
	if(!(digest_len == 0 || (digest_len >= 16 && digest_len <= 64)))
	{
		return false;
	}
	const inited = mkch_g_wi.exports.mk_clib_hasher_init(alg_idx);
	if(inited != 0)
	{
		return false;
	}
	if(data_len != 0)
	{
		const mem = mkch_sub_block(mkch_block_from_memory(mkch_g_wi.exports.memory), buffer_buf, buffer_len);
		const txt = mkch_sub_block(data, 0, data_len);
		mkch_memcpy(mem, 0, txt, 0, data_len);
	}
	const appended = mkch_g_wi.exports.mk_clib_hasher_append(data_len);
	if(appended != 0)
	{
		return false;
	}
	const finished = mkch_g_wi.exports.mk_clib_hasher_finish(xof_len);
	if(finished != 0)
	{
		return false;
	}
	const digest_buf = mkch_sub_block(mkch_block_from_memory(mkch_g_wi.exports.memory), buffer_buf, digest_len == 0 ? xof_len : digest_len);
	const digest_str = mkch_buff_to_str(digest_buf);
	return digest_str;
}

function mkch_hash_refresh_impl_text(args, file_state)
{
	const text = document.getElementById("text").value;
	const data = new Uint8Array(text.length * 3);
	const data_len = new TextEncoder().encodeInto(text, data).written;
	const computed = mkch_hash_compute(args.m_alg_idx, args.m_xof_len, data, data_len);
	mkch_on_finished(computed);
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
		mkch_g_file_state = null;
	}
}

function mkch_prepare_args()
{
	const filee = document.getElementById("file");
	const is_file = filee.value != "";
	const alge = document.getElementById("alg");
	const alg_idx = parseInt(alge.value, 10);
	console.assert(mkch_is_integer_non_negative(alg_idx));
	const digest_len = mkch_g_wi.exports.mk_clib_hasher_get_digest_len(alg_idx);
	const is_xof = digest_len == 0;
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
		m_alg_idx: alg_idx,
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
	if(!mkch_g_file_state)
	{
		mkch_g_file_state = file_state_new;
		mkch_hash_refresh_impl_both(args, file_state_new);
	}
	else
	{
		mkch_g_file_state.m_next = function(){ mkch_hash_refresh_impl_both(args, file_state_new); };
		mkch_g_file_state.m_cancel = true;
		mkch_g_file_state = file_state_new;
	}
}

function mkch_length_on_change()
{
	mkch_hash_refresh();
}

function mkch_alg_on_change()
{
	mkch_hash_refresh();
}

function mkch_file_on_change()
{
	mkch_hash_refresh();
}

function mkch_text_on_input()
{
	document.getElementById("file").value = null;
	mkch_hash_refresh();
}

function mkch_form_on_submit()
{
	mkch_hash_refresh();
	return false;
}

function mkch_parse_url()
{
	const f = new URL(window.location.href).hash;
	if
	(
		f.length >= 9 &&
		f[0] == '#' &&
		f[1] == '?' &&
		f[2] == 'h' &&
		f[3] == '=' &&
		true
	)
	{
		const alge = document.getElementById("alg");
		const pos = f.indexOf("&", 5);
		const h = f.substring(4, pos != -1 ? pos : f.length).toLowerCase();
		for(const o of alge.options)
		{
			if(o.label.toLowerCase() == h || o.value.toLowerCase() == h)
			{
				o.selected = true;
				mkch_alg_on_change();
				break;
			}
		}
		if
		(
			pos != -1 &&
			f.length >= pos + 4 &&
			f[pos + 1] == "t" &&
			f[pos + 2] == "=" &&
			true
		)
		{
			const text = document.getElementById("text");
			const t = decodeURIComponent(f.substring(pos + 3));
			text.value = t;
			mkch_text_on_input();
		}
	}
}

function mkch_populate_events()
{
	const form = document.getElementById("form");
	const text = document.getElementById("text");
	const file = document.getElementById("file");
	const alge = document.getElementById("alg");
	const length = document.getElementById("length");
	form.addEventListener("submit", mkch_form_on_submit);
	text.addEventListener("input", mkch_text_on_input);
	file.addEventListener("change", mkch_file_on_change);
	alge.addEventListener("change", mkch_alg_on_change);
	length.addEventListener("change", mkch_length_on_change);
}

function mkch_populate_algs()
{
	const alge = document.getElementById("alg");
	const alg_count = mkch_g_wi.exports.mk_clib_hasher_get_alg_count();
	for(let i = 0; i != alg_count; ++i)
	{
		const str_buf = mkch_g_wi.exports.mk_clib_hasher_get_alg_str_buf(i);
		const str_len = mkch_g_wi.exports.mk_clib_hasher_get_alg_str_len(i);
		const str_arr = new Uint8Array(mkch_g_wi.exports.memory.buffer, str_buf, str_len);
		const str_obj = new TextDecoder().decode(str_arr);
		const algi = new Option(str_obj, i.toString());
		alge.add(algi, undefined);
	}
	const default_alg = mkch_g_wi.exports.mk_clib_hasher_get_default_alg();
	alge.selectedIndex = default_alg;
}

function mkch_on_wasm_loaded(mkch_wm)
{
	const mkch_wi = mkch_wm.instance;
	mkch_g_wi = mkch_wi;
	mkch_populate_algs();
	mkch_populate_events();
	mkch_parse_url();
}

function mkch_load_wasm()
{
	const mkch_fp = fetch("mk_clib_hasher.wasm");
	const mkch_wp = WebAssembly.instantiateStreaming(mkch_fp);
	mkch_wp.then(mkch_on_wasm_loaded);
}

function mkch_start()
{
	window.onload = mkch_load_wasm;
}

mkch_start();
