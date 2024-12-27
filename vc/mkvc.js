"use strict";

function mkvc_to_hex(buffer)
{
	return [...new Uint8Array(buffer)]
	.map(x => x.toString(16).padStart(2, '0'))
	.join('');
}

function mkvc_min(a, b)
{
	return b < a ? b : a;
}

function mkvc_max(a, b)
{
	return b < a ? a : b;
}

function mkvc_sub_block(block, off, len)
{
	console.assert(block instanceof Uint8Array);
	console.assert(block.byteLength > off);
	console.assert(block.byteLength >= off + len);
	const sub = new Uint8Array(block.buffer, block.byteOffset + off, len);
	return sub;
}

function mkvc_block_from_memory(memory)
{
	console.assert(memory instanceof WebAssembly.Memory);
	const block = new Uint8Array(memory.buffer, 0, memory.buffer.byteLength);
	return block;
}

function mkvc_memcpy_impl(dst_buff, dst_off, src_buff, src_off, amount)
{
	console.assert(dst_buff instanceof Uint8Array);
	console.assert(src_buff instanceof Uint8Array);
	console.assert(dst_buff.byteLength > dst_off);
	console.assert(dst_buff.byteLength >= dst_off + amount);
	console.assert(src_buff.byteLength > src_off);
	console.assert(src_buff.byteLength >= src_off + amount);
	const dst_tmp = mkvc_sub_block(dst_buff, dst_off, amount);
	const src_tmp = mkvc_sub_block(src_buff, src_off, amount);
	dst_tmp.set(src_tmp, 0);
}

function mkvc_memcpy(dst_buff, dst_off, src_buff, src_off, amount)
{
	if(dst_buff instanceof WebAssembly.Memory)
	{
		const dst_tmp = mkvc_block_from_memory(dst_buff);
		mkvc_memcpy_impl(dst_tmp, dst_off, src_buff, src_off, amount);
	}
	else if(src_buff instanceof WebAssembly.Memory)
	{
		const src_tmp = mkvc_block_from_memory(src_buff);
		mkvc_memcpy_impl(dst_buff, dst_off, src_tmp, src_off, amount);
	}
	else
	{
		console.assert(dst_buff instanceof Uint8Array);
		console.assert(src_buff instanceof Uint8Array);
		mkvc_memcpy_impl(dst_buff, dst_off, src_buff, src_off, amount);
	}
}

function mkvc_real_reset(obj)
{
	obj.m_ofile_fsfh = null;
	obj.m_ofile_name = null;
	obj.m_ofile_fswfs = null;
	obj.m_ofile_wsdw = null;
	obj.m_pwd = null;
	obj.m_prf = null;
	obj.m_cpim = null;
	obj.m_ipim = null;
	obj.m_ifs = null;
	obj.m_ifr = null;
	obj.m_chunk_big_buf = null;
	obj.m_chunk_big_idx = null;
	obj.m_chunk_smol_buf = null;
	obj.m_chunk_smol_idx = null;
	obj.m_inited = null;
	obj.m_salt_buf = null;
	obj.m_salt_idx = null;
	obj.m_block_buf = null;
	obj.m_block_idx = null;
	obj.m_file_pointer = null;
	obj.m_wirps = null;
	obj.m_wirps_p = null;
	obj.m_write_ptr = null;
}

function mkvc_show_file_closing(obj)
{
	document.getElementById("result_p").textContent = "closing file...";
}

function mkvc_show_file_closed(obj)
{
	document.getElementById("result_p").textContent = "file closed";
}

function mkvc_show_file_close_failed(obj, err)
{
	document.getElementById("result_p").textContent = "error while closing file";
}

function mkvc_show_file_promise_err(obj, err)
{
	document.getElementById("result_p").textContent = "error happened while writing file";
}

function mkvc_show_file_write_ptr(obj)
{
	const kb_int = Math.floor(obj.m_write_ptr / 1024);
	const kb_str = kb_int.toLocaleString();
	document.getElementById("result_p").textContent = `writing ${kb_str} kB`;
}

function mkvc_at_write_end(obj)
{
	mkvc_show_file_closing(obj);
	const p = obj.m_ofile_wsdw.close();
	p.then( function(){ mkvc_show_file_closed(obj); mkvc_real_reset(obj); }, function(err){ mkvc_show_file_close_failed(obj, err); mkvc_real_reset(obj); } );
}

function mkvc_reset(obj)
{
	if(obj.m_ofile_wsdw !== null)
	{
		if(obj.m_wirps_p !== null)
		{
			obj.m_wirps_p.then( function(){ mkvc_at_write_end(obj); }, function(err){ mkvc_show_file_promise_err(obj, err); mkvc_real_reset(obj); } );
		}
		else
		{
			mkvc_at_write_end(obj);
		}
	}
	else
	{
		mkvc_real_reset(obj);
	}
}

function mkvc_schedule_write_impl(obj, block)
{
	const wp = obj.m_ofile_wsdw.write(block);
	obj.m_wirps_p = wp;
	obj.m_write_ptr += block.byteLength;
	mkvc_show_file_write_ptr(obj);
}

function mkvc_schedule_write(obj, block_shared)
{
	const block_private = new Uint8Array(block_shared.byteLength);
	mkvc_memcpy(block_private, 0, block_shared, 0, block_shared.byteLength);
	if(obj.m_wirps_p === null)
	{
		mkvc_schedule_write_impl(obj, block_private);
	}
	else
	{
		obj.m_wirps_p.then( function(){ mkvc_schedule_write_impl(obj, block_private); }, function(err){ mkvc_show_file_promise_err(obj, err); } );
	}
}

function mkvc_decrypt_5(obj, block)
{
	const addr = obj.m_wi.exports.mkvc_get_data_addr();
	const size = obj.m_wi.exports.mkvc_get_data_size();
	console.assert(obj.m_block_buf.byteLength === 512);
	console.assert(block.byteLength % obj.m_block_buf.byteLength === 0);
	console.assert(block.byteLength <= size);
	const blocks = block.byteLength / obj.m_block_buf.byteLength;
	mkvc_memcpy(obj.m_wi.exports.memory, addr, block, 0, block.byteLength);
	obj.m_wi.exports.mkvc_append(blocks);
	mkvc_memcpy(block, 0, obj.m_wi.exports.memory, addr, block.byteLength);
	mkvc_schedule_write(obj, block);
}

function mkvc_decrypt_4(obj, block)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	const size = obj.m_wi.exports.mkvc_get_data_size();
	console.assert(size % obj.m_block_buf.byteLength === 0);
	const len = mkvc_min(size, Math.floor(block.byteLength / obj.m_block_buf.byteLength) * obj.m_block_buf.byteLength);
	if(len !== 0)
	{
		const block_2 = mkvc_sub_block(block, 0, len);
		mkvc_decrypt_5(obj, block_2);
		obj.m_file_pointer += len;
	}
}

function mkvc_decrypt_3(obj, block)
{
	const data_begin = 128 * 1024;
	const size = obj.m_wi.exports.mkvc_get_data_size();
	if(obj.m_file_pointer < data_begin)
	{
		const consume_want = data_begin - obj.m_file_pointer;
		const consume_real = mkvc_min(block.byteLength, consume_want);
		const rem = block.byteLength - consume_real;
		if(rem != 0)
		{
			const block_2 = mkvc_sub_block(block, consume_real, rem);
			mkvc_decrypt_4(obj, block_2);
		}
		else
		{
			obj.m_file_pointer += consume_real;
		}
	}
	else
	{
		mkvc_decrypt_4(obj, block);
	}
}

function mkvc_decrypt_2(obj)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	const size = obj.m_wi.exports.mkvc_get_data_size();
	if(obj.m_chunk_smol_idx !== obj.m_chunk_smol_buf.byteLength)
	{
		console.assert(obj.m_chunk_smol_idx < obj.m_chunk_smol_buf.byteLength);
		const len = obj.m_chunk_smol_buf.byteLength - obj.m_chunk_smol_idx;
		console.assert(len === obj.m_block_buf.byteLength);
		const old_ptr = obj.m_file_pointer;
		mkvc_decrypt_3(obj, obj.m_chunk_smol_buf);
		const consumed = obj.m_file_pointer - old_ptr;
		obj.m_chunk_smol_idx += consumed;
		console.assert(obj.m_chunk_smol_idx === obj.m_chunk_smol_buf.byteLength);
	}
	if((obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx) >= obj.m_block_buf.byteLength)
	{
		const off = obj.m_chunk_big_idx;
		const rem = obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx;
		const old_ptr = obj.m_file_pointer;
		const buff_2 = mkvc_sub_block(obj.m_chunk_big_buf, off, rem);
		mkvc_decrypt_3(obj, buff_2);
		const consumed = obj.m_file_pointer - old_ptr;
		obj.m_chunk_big_idx += consumed;
	}
}

function mkvc_data_amount(obj)
{
	let amount = 0;
	if(obj.m_chunk_smol_idx !== obj.m_chunk_smol_buf.byteLength)
	{
		console.assert(obj.m_chunk_smol_idx < obj.m_chunk_smol_buf.byteLength);
		amount += obj.m_chunk_smol_buf.byteLength - obj.m_chunk_smol_idx;
	}
	console.assert(obj.m_chunk_big_buf.byteLength >= obj.m_chunk_big_idx);
	amount += obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx;
	return amount;
}

function mkvc_decrypt(obj, next_read)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	while(mkvc_data_amount(obj) >= obj.m_block_buf.byteLength)
	{
		mkvc_decrypt_2(obj);
	}
	next_read(obj, next_read);
}

function mkvc_init(obj)
{
	if(obj.m_salt_idx !== obj.m_salt_buf.byteLength)
	{
		console.assert(obj.m_chunk_big_idx === 0);
		console.assert(obj.m_salt_buf.byteLength === 64);
		console.assert(obj.m_salt_idx < obj.m_salt_buf.byteLength);
		const to_copy = mkvc_min(obj.m_salt_buf.byteLength - obj.m_salt_idx, obj.m_chunk_big_buf.byteLength);
		mkvc_memcpy(obj.m_salt_buf, obj.m_salt_idx, obj.m_chunk_big_buf, obj.m_chunk_big_idx, to_copy);
		obj.m_file_pointer += to_copy;
		obj.m_chunk_big_idx += to_copy;
		obj.m_salt_idx += to_copy;
	}
	if(obj.m_salt_idx === obj.m_salt_buf.byteLength)
	{
		if(obj.m_block_idx !== obj.m_block_buf.byteLength)
		{
			console.assert(obj.m_block_buf.byteLength === 512);
			console.assert(obj.m_block_idx < obj.m_block_buf.byteLength);
			const to_copy = mkvc_min(obj.m_block_buf.byteLength - obj.m_block_idx, obj.m_chunk_big_buf.byteLength);
			mkvc_memcpy(obj.m_block_buf, obj.m_block_idx, obj.m_chunk_big_buf, obj.m_chunk_big_idx, to_copy);
			obj.m_file_pointer += to_copy;
			obj.m_chunk_big_idx += to_copy;
			obj.m_block_idx += to_copy;
		}
		if(obj.m_block_idx === obj.m_block_buf.byteLength)
		{
			const addr = obj.m_wi.exports.mkvc_get_data_addr();
			const size = obj.m_wi.exports.mkvc_get_data_size();
			console.assert(addr >= 0 && addr <= 2 * 1024 * 1024);
			console.assert(size >= 64 * 1024);
			let ptr = addr;
			mkvc_memcpy(obj.m_wi.exports.memory, ptr, obj.m_block_buf, 0, obj.m_block_buf.byteLength); ptr += obj.m_block_buf.byteLength;
			mkvc_memcpy(obj.m_wi.exports.memory, ptr, obj.m_salt_buf, 0, obj.m_salt_buf.byteLength); ptr += obj.m_salt_buf.byteLength;
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = obj.m_cpim ? 1 : 0; ++ptr;
			console.assert(obj.m_ipim >= 0 && obj.m_ipim <= 4 * 1024 * 1024 * 1024);
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (0 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (1 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (2 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (3 * 8)) & 0xff; ++ptr;
			console.assert(obj.m_prf.byteLength >= 1 && obj.m_prf.byteLength <= 0xff);
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = obj.m_prf.byteLength & 0xff; ++ptr;
			mkvc_memcpy(obj.m_wi.exports.memory, ptr, obj.m_prf, 0, obj.m_prf.byteLength); ptr += obj.m_prf.byteLength;
			console.assert(obj.m_pwd.byteLength >= 1 && obj.m_pwd.byteLength <= 4 * 1024);
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = (obj.m_pwd.byteLength >> (0 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_wi.exports.memory.buffer, ptr, 1))[0] = (obj.m_pwd.byteLength >> (1 * 8)) & 0xff; ++ptr;
			mkvc_memcpy(obj.m_wi.exports.memory, ptr, obj.m_pwd, 0, obj.m_pwd.byteLength); ptr += obj.m_pwd.byteLength;
			const inited = obj.m_wi.exports.mkvc_init();
			if(inited === 0)
			{
				obj.m_block_idx = 0;
				obj.m_inited = true;
			}
			else
			{
				obj.m_inited = false;
			}
		}
	}
}

function mkvc_file_read_continue_chunk(obj, next_read)
{
	if(obj.m_inited === null)
	{
		mkvc_init(obj);
		if(obj.m_inited === false)
		{
			mkvc_reset(obj);
			document.getElementById("result_p").textContent = "Could not decrypt header.";
		}
		else if(obj.m_inited === true)
		{
			mkvc_decrypt(obj, next_read);
		}
	}
	else if(obj.m_inited === true)
	{
		mkvc_decrypt(obj, next_read);
	}
}

function mkvc_file_read_on_finished(obj, next_read, value_done)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	console.assert(obj.m_chunk_smol_buf.byteLength === 512);
	if(value_done.done)
	{
		document.getElementById("ofiletxt").textContent = "done";
		mkvc_reset(obj);
	}
	else
	{
		const chunk = value_done.value;
		if(obj.m_chunk_big_buf !== null && obj.m_chunk_big_idx !== obj.m_chunk_big_buf.byteLength)
		{
			console.assert(obj.m_chunk_big_idx < obj.m_chunk_big_buf.byteLength);
			const rem = obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx;
			console.assert(rem < obj.m_block_buf.byteLength);
			const cap = obj.m_block_buf.byteLength - rem;
			const to_copy = mkvc_min(cap, chunk.byteLength);
			mkvc_memcpy(obj.m_chunk_smol_buf, 0, obj.m_chunk_big_buf, obj.m_chunk_big_idx, rem);
			mkvc_memcpy(obj.m_chunk_smol_buf, rem, chunk, 0, to_copy);
			obj.m_chunk_smol_idx = 0;
			obj.m_chunk_big_buf = chunk;
			obj.m_chunk_big_idx = to_copy;
		}
		else
		{
			obj.m_chunk_smol_idx = obj.m_chunk_smol_buf.byteLength;
			obj.m_chunk_big_buf = chunk;
			obj.m_chunk_big_idx = 0;
		}
		mkvc_file_read_continue_chunk(obj, next_read);
	}
}

function mkvc_file_read_on_errored(obj, err)
{
	console.log(err);
}

function mkvc_go(obj)
{
	obj.m_salt_buf = new Uint8Array(64);
	obj.m_salt_idx = 0;
	obj.m_block_buf = new Uint8Array(512);
	obj.m_block_idx = 0;
	obj.m_file_pointer = 0;
	obj.m_chunk_smol_buf = new Uint8Array(512);
	obj.m_chunk_smol_idx = obj.m_chunk_smol_buf.byteLength;
	obj.m_wirps = new Uint8Array(64 * 1024);
	obj.m_wirps_p = null;
	obj.m_write_ptr = 0;
	const ifs = obj.m_ifile.stream();
	obj.m_ifs = ifs;
	const ifr = obj.m_ifs.getReader();
	obj.m_ifr = ifr;
	const rp = obj.m_ifr.read();
	const next_read = function(obj, nx)
	{
		const rp = obj.m_ifr.read();
		rp.then( function(value_done){ mkvc_file_read_on_finished(obj, nx, value_done); }, function(err){ mkvc_file_read_on_errored(obj, err); } );
	};
	rp.then( function(value_done){ mkvc_file_read_on_finished(obj, next_read, value_done); }, function(err){ mkvc_file_read_on_errored(obj, err); } );
}

function mkvc_get_num(name, min_val, def_val, max_val)
{
	console.assert(min_val <= def_val);
	console.assert(def_val <= max_val);
	const element = document.getElementById(name);
	let val_ = element.value;
	val_ = parseInt(val_, 10);
	val_ = Number.isNaN(val_) ? def_val : val_;
	val_ = val_ < min_val ? min_val : val_;
	val_ = val_ > max_val ? max_val : val_;
	const val = val_;
	console.assert(val >= min_val && val <= max_val);
	return val;
}

function mkvc_get_checkbox(name)
{
	const element = document.getElementById(name);
	const val = !!element.checked;
	return val;
}

function mkvc_get_select(name)
{
	const element = document.getElementById(name);
	const buff = new Uint8Array(0xff);
	const len = (new TextEncoder()).encodeInto(element.value, buff).written;
	const buff_smol = new Uint8Array(len);
	mkvc_memcpy(buff_smol, 0, buff, 0, len);
	return buff_smol;
}

function mkvc_get_text(name)
{
	const element = document.getElementById(name);
	const buff = new Uint8Array(4 * 1024);
	const len = (new TextEncoder()).encodeInto(element.value, buff).written;
	const buff_smol = new Uint8Array(len);
	mkvc_memcpy(buff_smol, 0, buff, 0, len);
	return buff_smol;
}

function mkvc_verify(obj)
{
	let gud = true;
	gud = gud && obj.m_wm !== null;
	gud = gud && obj.m_wi !== null;
	gud = gud && obj.m_ifile !== null;
	gud = gud && obj.m_ofile_fsfh !== null;
	gud = gud && obj.m_ofile_name !== null;
	gud = gud && obj.m_ofile_fswfs !== null;
	gud = gud && obj.m_ofile_wsdw !== null;
	gud = gud && obj.m_pwd !== null;
	gud = gud && obj.m_prf !== null;
	gud = gud && obj.m_cpim !== null;
	gud = gud && obj.m_ipim !== null;
	return gud;
}

function mkvc_get_args(obj)
{
	obj.m_ifile = null;
	obj.m_pwd = null;
	obj.m_prf = null;
	obj.m_cpim = null;
	obj.m_ipim = null;
	const ifile = document.getElementById("ifile");
	const is_ifile = ifile.value !== "";
	if(!is_ifile)
	{
		return;
	}
	if(ifile.files.length !== 1)
	{
		return;
	}
	const pwd = mkvc_get_text("pwd");
	const prf = mkvc_get_select("prf");
	const cpim = mkvc_get_checkbox("cpim");
	const ipim = mkvc_get_num("ipim", 1, 500 * 1000, 4294967295);
	obj.m_ifile = ifile.files[0];
	obj.m_pwd = pwd;
	obj.m_prf = prf;
	obj.m_cpim = cpim;
	obj.m_ipim = ipim;
}

function mkvc_decrypt_on_click(obj)
{
	mkvc_get_args(obj);
	if(!mkvc_verify(obj))
	{
		mkvc_reset(obj);
		document.getElementById("ofiletxt").textContent = "";
		return;
	}
	mkvc_go(obj);
}

function mkvc_cpim_on_click(obj)
{
	const cpim = document.getElementById("cpim");
	const ipim = document.getElementById("ipim");
	obj.cpim = !cpim.checked;
	ipim.disabled = obj.cpim;
}

function mkvc_ofile_reset(obj)
{
	obj.m_ofile_fsfh = null;
	obj.m_ofile_name = null;
	obj.m_ofile_fswfs = null;
	obj.m_ofile_wsdw = null;
	document.getElementById("ofiletxt").textContent = "";
}

function mkvc_ofile_on_error_all(obj)
{
	mkvc_ofile_reset(obj);
}

function mkvc_ofile_on_error_b(obj, err)
{
	mkvc_ofile_on_error_all(obj);
}

function mkvc_ofile_on_error_a(obj, err)
{
	mkvc_ofile_on_error_all(obj);
}

function mkvc_ofile_on_fswfs(obj, fswfs)
{
	const wsdw = fswfs.getWriter();
	obj.m_ofile_fswfs = fswfs;
	obj.m_ofile_wsdw = wsdw;
	document.getElementById("ofiletxt").textContent = obj.m_ofile_name;
}

function mkvc_ofile_on_selected(obj, fsfh)
{
	if(fsfh.kind === "file")
	{
		obj.m_ofile_fsfh = fsfh;
		obj.m_ofile_name = fsfh.name;
		const fswfsp = fsfh.createWritable();
		fswfsp.then( function(fswfs){ mkvc_ofile_on_fswfs(obj, fswfs); }, function(err){ mkvc_ofile_on_error_b(obj, err); } );
	}
}

function mkvc_ofile_on_click(obj)
{
	mkvc_ofile_reset(obj);
	const fsfhp = window.showSaveFilePicker();
	fsfhp.then( function(fsfh){ mkvc_ofile_on_selected(obj, fsfh); }, function(err){ mkvc_ofile_on_error_a(obj, err); } );
}

function mkvc_form_on_submit(obj)
{
}

function mkvc_populate_events(obj)
{
	const form = document.getElementById("form");
	const ofile = document.getElementById("ofile");
	const cpim = document.getElementById("cpim");
	const decrypt = document.getElementById("decrypt");
	form.addEventListener("submit", function(event){ event.preventDefault(); mkvc_form_on_submit(obj); return false; })
	ofile.addEventListener("click", function(){ mkvc_ofile_on_click(obj); } );
	cpim.addEventListener("click", function(){ mkvc_cpim_on_click(obj); } );
	decrypt.addEventListener("click", function(){ mkvc_decrypt_on_click(obj); } );
}

function mkvc_on_wasm_loaded(obj, ro)
{
	const wm = ro.module;
	const wi = ro.instance;
	obj.m_wm = wm;
	obj.m_wi = wi;
	mkvc_populate_events(obj);
}

function mkvc_us_on_chunk(rsdc, reader, self, bytes_cnt, o)
{
	if(!o.done)
	{
		const bytes_cnt_new = bytes_cnt + o.value.length;
		const kbs = Math.trunc(bytes_cnt_new / 1024).toLocaleString();
		document.getElementById("result_p").textContent = `Loading... ${kbs} kB`;
		rsdc.enqueue(o.value);
		const po = reader.read();
		po.then( function(o){ self(rsdc, reader, self, bytes_cnt_new, o); } );
	}
	else
	{
		document.getElementById("result_p").textContent = "";
		rsdc.close();
	}
}

function mkvc_us_on_start(rsdc, reader)
{
	const po = reader.read();
	po.then( function(o){ mkvc_us_on_chunk(rsdc, reader, mkvc_us_on_chunk, 0, o); } );
}

function mkvc_print(obj, ptr, len)
{
	const text = (new TextDecoder()).decode(mkvc_sub_block(mkvc_block_from_memory(obj.m_wi.exports.memory), ptr, len));
	console.log(text);
}

function mkvc_on_response(obj, response)
{
	const body = response.body;
	const reader = body.getReader();
	const us = { start: function(rsdc){ return mkvc_us_on_start(rsdc, reader); }, };
	const rs = new ReadableStream(us);
	const options = { status: response.status, statusText: response.statusText, headers: response.headers, };
	const res = new Response(rs, options);
	const imports = { env: { js_debug_print: function(ptr, len){ mkvc_print(obj, ptr, len); } } };
	const pro = WebAssembly.instantiateStreaming(res, imports);
	pro.then( function(ro){ mkvc_on_wasm_loaded(obj, ro); } );
}

function mkvc_run(obj)
{
	document.getElementById("result_p").textContent = "Loading...";
	const pr = window.fetch("mkvc.wasm");
	pr.then( function(r){ mkvc_on_response(obj, r); } );
}

function mkvc_make()
{
	const obj =
	{
		m_wm: null,
		m_wi: null,
		m_ifile: null,
		m_ofile_fsfh: null,
		m_ofile_name: null,
		m_ofile_fswfs: null,
		m_ofile_wsdw: null,
		m_pwd: null,
		m_prf: null,
		m_cpim: null,
		m_ipim: null,
		m_ifs: null,
		m_ifr: null,
		m_chunk_big_buf: null,
		m_chunk_big_idx: null,
		m_chunk_smol_buf: null,
		m_chunk_smol_idx: null,
		m_inited: null,
		m_salt_buf: null,
		m_salt_idx: null,
		m_block_buf: null,
		m_block_idx: null,
		m_file_pointer: null,
		m_wirps: null,
		m_wirps_p: null,
		m_write_ptr: null,
	};
	mkvc_reset(obj);
	document.getElementById("ofiletxt").textContent = "";
	return obj;
}

function mkvc_on_window_loaded()
{
	const obj = mkvc_make();
	mkvc_run(obj);
}

function mkvc_start()
{
	window.addEventListener("load", mkvc_on_window_loaded);
}

mkvc_start();
