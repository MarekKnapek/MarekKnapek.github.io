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

function mkvc_memclear(block)
{
	const n = block.byteLength;
	for(let i = 0; i != n; ++i)
	{
		block[i] = 0x00;
	}
}

function mkvc_real_reset(obj)
{
	obj.m_ofile_handle = null;
	obj.m_ofile_name = null;
	obj.m_ofile_ofs = null;
	obj.m_ofile_writer = null;
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
	obj.m_write_ptr = null;
}

function mkvc_show_reset(obj)
{
	const str = "";
	console.log(str);
	document.getElementById("result_p").textContent = str;
}

function mkvc_show_msg(obj, txt)
{
	const str = txt;
	console.log(str);
	document.getElementById("result_p").textContent = str;
}

function mkvc_show_error(obj, txt)
{
	const str = `Error: ${txt}`;
	console.log(str);
	document.getElementById("result_p").textContent = str;
}

function mkvc_show_promise_reason(obj, reason, txt)
{
	const str = `Error: "${txt}", promise rejected with "${reason}" reason.`;
	console.log(str);
	document.getElementById("result_p").textContent = str;
}

function mkvc_show_file_write_ptr(obj)
{
	const kb_int = Math.floor(obj.m_write_ptr / 1024);
	const kb_str = kb_int.toLocaleString();
	const msg = `Writing... ${kb_str} kB.`;
	mkvc_show_msg(obj, msg);
}

function mkvc_at_write_end(obj)
{
	mkvc_show_msg(obj, "Closing file...");
	const p = obj.m_ofile_writer.close();
	p.then( function(){ mkvc_show_msg(obj, "File closed, done."); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to close file."); } );
	mkvc_real_reset(obj);
}

function mkvc_reset(obj)
{
	if(obj.m_ofile_writer !== null)
	{
		mkvc_at_write_end(obj);
	}
	else
	{
		mkvc_real_reset(obj);
	}
}

function mkvc_schedule_write_3(obj, next_action, block)
{
	const p_write = obj.m_ofile_writer.write(block);
	obj.m_write_ptr += block.byteLength;
	mkvc_show_file_write_ptr(obj);
	p_write.then( function(){ next_action(obj, next_action); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to enqueue next write."); } );
}

function mkvc_schedule_write_2(obj, next_action, block)
{
	const header_len = 1 * 1024 * 1024;
	const rem = header_len - obj.m_write_ptr;
	const block_2 = new Uint8Array(rem);
	mkvc_memclear(block_2);
	const p_write = obj.m_ofile_writer.write(block_2);
	obj.m_write_ptr += block_2.byteLength;
	mkvc_show_file_write_ptr(obj);
	p_write.then( function(){ mkvc_schedule_write_3(obj, next_action, block); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to enqueue next write."); } );
}

function mkvc_schedule_write_1(obj, next_action, block)
{
	const header_len = 1 * 1024 * 1024;
	if(obj.m_write_ptr < header_len)
	{
		mkvc_schedule_write_2(obj, next_action, block);
	}
	else
	{
		mkvc_schedule_write_3(obj, next_action, block);
	}
}

function mkvc_decrypt_5(obj, next_action, block)
{
	const addr = obj.m_instance.exports.mkvc_get_data_addr();
	const size = obj.m_instance.exports.mkvc_get_data_size();
	const len = block.byteLength;
	console.assert(obj.m_block_buf.byteLength === 512);
	console.assert(len % obj.m_block_buf.byteLength === 0);
	console.assert(len <= size);
	const blocks = len / obj.m_block_buf.byteLength;
	mkvc_memcpy(mkvc_sub_block(mkvc_block_from_memory(obj.m_instance.exports.memory), addr, len), 0, block, 0, len);
	obj.m_instance.exports.mkvc_append(blocks);
	const block_2 = mkvc_sub_block(mkvc_block_from_memory(obj.m_instance.exports.memory), addr, len);
	mkvc_schedule_write_1(obj, next_action, block_2);
}

function mkvc_decrypt_4(obj, next_action, block, adjust_read)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	const size = obj.m_instance.exports.mkvc_get_data_size();
	console.assert(size % obj.m_block_buf.byteLength === 0);
	const len = mkvc_min(size, Math.floor(block.byteLength / obj.m_block_buf.byteLength) * obj.m_block_buf.byteLength);
	if(len !== 0)
	{
		const block_2 = mkvc_sub_block(block, 0, len);
		obj.m_file_pointer += len;
		adjust_read(obj);
		mkvc_decrypt_5(obj, next_action, block_2);
	}
}

function mkvc_decrypt_3(obj, next_action, block, adjust_read)
{
	const data_begin = 128 * 1024;
	if(obj.m_file_pointer < data_begin)
	{
		const consume_want = data_begin - obj.m_file_pointer;
		const consume_real = mkvc_min(block.byteLength, consume_want);
		const rem = block.byteLength - consume_real;
		if(rem != 0)
		{
			obj.m_file_pointer += consume_real;
			const block_2 = mkvc_sub_block(block, consume_real, rem);
			mkvc_decrypt_4(obj, next_action, block_2, adjust_read);
		}
		else
		{
			obj.m_file_pointer += consume_real;
			adjust_read(obj);
			next_action(obj, next_action);
		}
	}
	else
	{
		mkvc_decrypt_4(obj, next_action, block, adjust_read);
	}
}

function adjust_read_a(obj, old_ptr)
{
	const consumed = obj.m_file_pointer - old_ptr;
	obj.m_chunk_smol_idx += consumed;
	console.assert(obj.m_chunk_smol_idx === obj.m_chunk_smol_buf.byteLength);
};

function adjust_read_b(obj, old_ptr)
{
	const consumed = obj.m_file_pointer - old_ptr;
	obj.m_chunk_big_idx += consumed;
};

function mkvc_decrypt_2(obj, next_action)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	if(obj.m_chunk_smol_idx !== obj.m_chunk_smol_buf.byteLength)
	{
		console.assert(obj.m_chunk_smol_idx < obj.m_chunk_smol_buf.byteLength);
		const len = obj.m_chunk_smol_buf.byteLength - obj.m_chunk_smol_idx;
		console.assert(len === obj.m_block_buf.byteLength);
		const old_ptr = obj.m_file_pointer;
		mkvc_decrypt_3(obj, next_action, obj.m_chunk_smol_buf, function(obj){ adjust_read_a(obj, old_ptr); } );
	}
	if((obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx) >= obj.m_block_buf.byteLength)
	{
		const off = obj.m_chunk_big_idx;
		const rem = obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx;
		const old_ptr = obj.m_file_pointer;
		const buff_2 = mkvc_sub_block(obj.m_chunk_big_buf, off, rem);
		mkvc_decrypt_3(obj, next_action, buff_2, function(obj){ adjust_read_b(obj, old_ptr); } );
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

function mkvc_decrypt_b(obj, next_action, next_read)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	if(mkvc_data_amount(obj) >= obj.m_block_buf.byteLength)
	{
		mkvc_decrypt_2(obj, next_action);
	}
	else
	{
		next_read(obj, next_read);
	}
}

function mkvc_decrypt_a(obj, next_read)
{
	const nx = function(obj, next_action){ mkvc_decrypt_b(obj, next_action, next_read); };
	mkvc_decrypt_b(obj, nx, next_read);
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
			const addr = obj.m_instance.exports.mkvc_get_data_addr();
			const size = obj.m_instance.exports.mkvc_get_data_size();
			console.assert(addr >= 0 && addr <= 2 * 1024 * 1024);
			console.assert(size >= 64 * 1024);
			let ptr = addr;
			mkvc_memcpy(obj.m_instance.exports.memory, ptr, obj.m_block_buf, 0, obj.m_block_buf.byteLength); ptr += obj.m_block_buf.byteLength;
			mkvc_memcpy(obj.m_instance.exports.memory, ptr, obj.m_salt_buf, 0, obj.m_salt_buf.byteLength); ptr += obj.m_salt_buf.byteLength;
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = obj.m_cpim ? 1 : 0; ++ptr;
			console.assert(obj.m_ipim >= 0 && obj.m_ipim <= 4 * 1024 * 1024 * 1024);
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (0 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (1 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (2 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = (obj.m_ipim >> (3 * 8)) & 0xff; ++ptr;
			console.assert(obj.m_prf.byteLength >= 1 && obj.m_prf.byteLength <= 0xff);
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = obj.m_prf.byteLength & 0xff; ++ptr;
			mkvc_memcpy(obj.m_instance.exports.memory, ptr, obj.m_prf, 0, obj.m_prf.byteLength); ptr += obj.m_prf.byteLength;
			console.assert(obj.m_pwd.byteLength >= 1 && obj.m_pwd.byteLength <= 4 * 1024);
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = (obj.m_pwd.byteLength >> (0 * 8)) & 0xff; ++ptr;
			(new Uint8Array(obj.m_instance.exports.memory.buffer, ptr, 1))[0] = (obj.m_pwd.byteLength >> (1 * 8)) & 0xff; ++ptr;
			mkvc_memcpy(obj.m_instance.exports.memory, ptr, obj.m_pwd, 0, obj.m_pwd.byteLength); ptr += obj.m_pwd.byteLength;
			mkvc_show_msg(obj, "Deriving keys and decrypting header...");
			const inited = obj.m_instance.exports.mkvc_init();
			if(inited === 0)
			{
				mkvc_show_msg(obj, "Header decrypted.");
				obj.m_block_idx = 0;
				obj.m_inited = true;
			}
			else
			{
				mkvc_show_error(obj, "Could not decrypt header.");
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
		}
		else if(obj.m_inited === true)
		{
			mkvc_decrypt_a(obj, next_read);
		}
	}
	else if(obj.m_inited === true)
	{
		mkvc_decrypt_a(obj, next_read);
	}
}

function mkvc_file_read_on_finished(obj, next_read, value_done)
{
	console.assert(obj.m_block_buf.byteLength === 512);
	console.assert(obj.m_chunk_smol_buf.byteLength === 512);
	if(value_done.done)
	{
		document.getElementById("ofiletxt").textContent = "";
		mkvc_reset(obj);
	}
	else
	{
		const chunk = value_done.value;
		if(obj.m_chunk_big_buf !== null && obj.m_chunk_big_idx !== obj.m_chunk_big_buf.byteLength)
		{
			console.assert(obj.m_chunk_big_idx < obj.m_chunk_big_buf.byteLength);
			const rem = obj.m_chunk_big_buf.byteLength - obj.m_chunk_big_idx;
			console.assert(rem < obj.m_chunk_smol_buf.byteLength);
			const cap = obj.m_chunk_smol_buf.byteLength - rem;
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

function mkvc_next_read(obj, self)
{
	const p_value_done = obj.m_ifr.read();
	p_value_done.then( function(value_done){ mkvc_file_read_on_finished(obj, self, value_done); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to read from input streamm."); } );
};

function mkvc_go(obj)
{
	const ifile = obj.m_ifile;
	const ifs = ifile.stream();
	const ifr = ifs.getReader();
	obj.m_salt_buf = new Uint8Array(64);
	obj.m_salt_idx = 0;
	obj.m_block_buf = new Uint8Array(512);
	obj.m_block_idx = 0;
	obj.m_file_pointer = 0;
	obj.m_chunk_smol_buf = new Uint8Array(512);
	obj.m_chunk_smol_idx = obj.m_chunk_smol_buf.byteLength;
	obj.m_write_ptr = 0;
	obj.m_ifs = ifs;
	obj.m_ifr = ifr;
	const p_value_done = obj.m_ifr.read();
	p_value_done.then( function(value_done){ mkvc_file_read_on_finished(obj, mkvc_next_read, value_done); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to read from input streamm."); } );
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
	gud = gud && obj.m_module !== null;
	gud = gud && obj.m_instance !== null;
	gud = gud && obj.m_ifile !== null;
	gud = gud && obj.m_ofile_handle !== null;
	gud = gud && obj.m_ofile_name !== null;
	gud = gud && obj.m_ofile_ofs !== null;
	gud = gud && obj.m_ofile_writer !== null;
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
		mkvc_show_error(obj, "Please select input file.");
		return false;
	}
	if(ifile.files.length !== 1)
	{
		mkvc_show_error(obj, "Please select single input file.");
		return false;
	}
	if(obj.m_ofile_writer === null)
	{
		mkvc_show_error(obj, "Please select output file.");
		return false;
	}
	const pwd = mkvc_get_text("pwd");
	const prf = mkvc_get_select("prf");
	const cpim = mkvc_get_checkbox("cpim");
	const ipim = mkvc_get_num("ipim", 1, 485, 1000000);
	obj.m_ifile = ifile.files[0];
	obj.m_pwd = pwd;
	obj.m_prf = prf;
	obj.m_cpim = cpim;
	obj.m_ipim = ipim;
	return true;
}

function mkvc_decrypt_on_click(obj)
{
	if(!mkvc_get_args(obj))
	{
		return;
	}
	if(!mkvc_verify(obj))
	{
		mkvc_show_error(obj, "Something went wrong.");
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

function mkvc_ofile_on_ofs(obj, ofs)
{
	const writer = ofs.getWriter();
	obj.m_ofile_ofs = ofs;
	obj.m_ofile_writer = writer;
	document.getElementById("ofiletxt").textContent = obj.m_ofile_name;
}

function mkvc_ofile_on_selected(obj, file_system_file_handle)
{
	if(file_system_file_handle.kind !== "file")
	{
		mkvc_show_error(obj, "Selected thing is not a file.");
		return;
	}
	obj.m_ofile_handle = file_system_file_handle;
	obj.m_ofile_name = file_system_file_handle.name;
	const p_ofs = file_system_file_handle.createWritable();
	p_ofs.then( function(ofs){ mkvc_ofile_on_ofs(obj, ofs); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to create writeable output stream."); } );
}

function mkvc_ofile_on_click(obj)
{
	document.getElementById("ofiletxt").textContent = "";
	const p_file_system_file_handle = window.showSaveFilePicker();
	p_file_system_file_handle.then( function(file_system_file_handle){ mkvc_ofile_on_selected(obj, file_system_file_handle); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to get save file handle."); } );
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

function mkvc_on_wasm_loaded(obj, result_object)
{
	mkvc_show_msg(obj, "Done downloading WASM.");
	const wmodule = result_object.module;
	const winstance = result_object.instance;
	obj.m_module = wmodule;
	obj.m_instance = winstance;
	mkvc_populate_events(obj);
}

function mkvc_us_on_chunk(obj, reader, controller, self, bytes_cnt, chunk_done)
{
	if(!chunk_done.done)
	{
		const chunk = chunk_done.value;
		const bytes_cnt_new = bytes_cnt + chunk.length;
		const kbs = Math.trunc(bytes_cnt_new / 1024).toLocaleString();
		const msg = `Loading WASM... ${kbs} kB.`;
		mkvc_show_msg(obj, msg);
		controller.enqueue(chunk);
		const p_chunk_done = reader.read();
		p_chunk_done.then( function(chunk_done){ self(obj, reader, controller, mkvc_us_on_chunk, bytes_cnt_new, chunk_done); }, function(reason){ mkvc_show_promise_reason(ojb, reason, "Input stream became errored."); } );
	}
	else
	{
		controller.close();
	}
}

function mkvc_print(obj, ptr, len)
{
	const text = (new TextDecoder()).decode(mkvc_sub_block(mkvc_block_from_memory(obj.m_instance.exports.memory), ptr, len));
	console.log(text);
}

function mkvc_reader_on_start(obj, reader, controller)
{
	const p_chunk_done = reader.read();
	p_chunk_done.then( function(chunk_done){ mkvc_us_on_chunk(obj, reader, controller, mkvc_us_on_chunk, 0, chunk_done); }, function(reason){ mkvc_show_promise_reason(ojb, reason, "Input stream became errored."); } );
}

function mkvc_on_response(obj, response_a)
{
	if(!response_a.ok)
	{
		mkvc_show_error(obj, "Failed to get WASM module.");
		return;
	}
	const readable_stream_a = response_a.body;
	if(readable_stream_a === null)
	{
		mkvc_show_error(obj, "WASM response has no body.");
		return;
	}
	const reader = readable_stream_a.getReader();
	const underlying_source = { start: function(controller){ return mkvc_reader_on_start(obj, reader, controller); }, };
	const readable_stream_b = new ReadableStream(underlying_source);
	const options = { status: response_a.status, statusText: response_a.statusText, headers: response_a.headers, };
	const response_b = new Response(readable_stream_b, options);
	const imports = { env: { js_debug_print: function(ptr, len){ mkvc_print(obj, ptr, len); }, } };
	const p_result_object = WebAssembly.instantiateStreaming(response_b, imports);
	p_result_object.then( function(result_object){ mkvc_on_wasm_loaded(obj, result_object); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to instanciate WASM module."); } );
}

function mkvc_run(obj)
{
	mkvc_show_msg(obj, "Loading WASM...");
	const p_response = window.fetch("mkvc.wasm");
	p_response.then( function(response){ mkvc_on_response(obj, response); }, function(reason){ mkvc_show_promise_reason(obj, reason, "Failed to fetch WASM module."); } );
}

function mkvc_make()
{
	const obj =
	{
		m_module: null,
		m_instance: null,
		m_ifile: null,
		m_ofile_handle: null,
		m_ofile_name: null,
		m_ofile_ofs: null,
		m_ofile_writer: null,
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
		m_write_ptr: null,
	};
	mkvc_reset(obj);
	mkvc_show_reset(obj);
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
