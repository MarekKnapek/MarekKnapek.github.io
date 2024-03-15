"use strict";


let g_mkcc = null;


function mkcc_write_add_req(obj, buff, next)
{
	console.assert(obj.m_wops.length != obj.m_wops_cnt);
	const wop = obj.m_wsdw.write(buff);
	const wopb = { m_wop: wop, m_buff: buff, };
	obj.m_wops.push(wopb);
	obj.m_file_write_req += buff.byteLength;
	console.assert(obj.m_file_write_req >= obj.m_file_write_ful);
	obj.m_on_progress(obj);
	next();
}

function mkcc_write_on_req_finished(obj, next)
{
	console.assert(obj.m_wops.length != 0);
	const wopb = obj.m_wops.shift();
	obj.m_file_write_ful += wopb.m_buff.byteLength;
	console.assert(obj.m_file_write_ful <= obj.m_file_write_req);
	obj.m_on_progress(obj);
	next();
}

function mkcc_write_wait_and_next(obj, next)
{
	console.assert(obj.m_wops.length != 0);
	const wopb = obj.m_wops[0];
	wopb.m_wop.then( function(){ mkcc_write_on_req_finished(obj, next); } );
}

function mkcc_write_wait_all(obj, self, next)
{
	if(obj.m_wops.length != 0)
	{
		mkcc_write_wait_and_next(obj, function(){ self(obj, self, next); });
	}
	else
	{
		next();
	}
}

function mkcc_write_wait_and_add_req(obj, buff, next)
{
	mkcc_write_wait_and_next(obj, function(){ mkcc_write_add_req(obj, buff, next); } );
}

function mkcc_write_on_writer_ready(obj, buff, next)
{
	if(obj.m_wops.length != obj.m_wops_cnt)
	{
		mkcc_write_add_req(obj, buff, next);
	}
	else
	{
		mkcc_write_wait_and_add_req(obj, buff, next);
	}
}

function mkcc_write_append(obj, buff, next)
{
	const ready = obj.m_wsdw.ready;
	ready.then( function(){ mkcc_write_on_writer_ready(obj, buff, next); } );
}

function mkcc_encrypt_append(obj, ropb, next)
{
	new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength).set(new Uint8Array(ropb.m_arr, 0, ropb.m_arr.byteLength), 0);
	const appended = obj.m_wi.exports.mkcc_encrypt_append(ropb.m_arr.byteLength);
	console.assert(appended == 0);
	new Uint8Array(ropb.m_arr, 0, ropb.m_arr.byteLength).set(new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength), 0);
	mkcc_write_append(obj, ropb.m_arr, next);
}

function mkcc_decrypt_append(obj, ropb, next)
{
	new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength).set(new Uint8Array(ropb.m_arr, 0, ropb.m_arr.byteLength), 0);
	const appended = obj.m_wi.exports.mkcc_decrypt_append(ropb.m_arr.byteLength);
	console.assert(appended == 0);
	new Uint8Array(ropb.m_arr, 0, ropb.m_arr.byteLength).set(new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength), 0);
	mkcc_write_append(obj, ropb.m_arr, next);
}

function mkcc_encrypt_finish(obj, ropb)
{
	console.assert(obj.m_rops.length == 0);
	new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength).set(new Uint8Array(ropb.m_arr, 0, ropb.m_arr.byteLength), 0);
	const finished = obj.m_wi.exports.mkcc_encrypt_finish(ropb.m_arr.byteLength);
	console.assert(finished >= 0x01 && finished <= obj.m_iv_size_max);
	const buff = new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength + finished);
	const self = function(o, s, n){ mkcc_write_wait_all(o, s, n); };
	const next = function(){ mkcc_write_wait_all(obj, self, function(){ obj.m_on_end(obj); }); };
	mkcc_write_append(obj, buff, next);
}

function mkcc_decrypt_finish(obj, ropb)
{
	console.assert(obj.m_rops.length == 0);
	new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength).set(new Uint8Array(ropb.m_arr, 0, ropb.m_arr.byteLength), 0);
	const finished = obj.m_wi.exports.mkcc_decrypt_finish(ropb.m_arr.byteLength);
	console.assert(finished >= 0x01 && finished <= obj.m_iv_size_max);
	const buff = new Uint8Array(obj.m_data.buffer, obj.m_data.byteOffset, ropb.m_arr.byteLength - finished);
	const self = function(o, s, n){ mkcc_write_wait_all(o, s, n); };
	const next = function(){ mkcc_write_wait_all(obj, self, function(){ obj.m_on_end(obj); }); };
	mkcc_write_append(obj, buff, next);
}

function mkcc_read_on_req_finished_b(obj, ropb, next)
{
	if(!ropb.m_last)
	{
		if(obj.m_direction)
		{
			mkcc_encrypt_append(obj, ropb, next);
		}
		else
		{
			mkcc_decrypt_append(obj, ropb, next);
		}
	}
	else
	{
		if(obj.m_direction)
		{
			mkcc_encrypt_finish(obj, ropb);
		}
		else
		{
			mkcc_decrypt_finish(obj, ropb);
		}
	}
}

function mkcc_read_on_req_finished_a(obj, ropb, arr, next)
{
	console.assert(obj.m_rops.length != 0);
	console.assert(ropb.m_len == arr.byteLength);
	ropb.m_fulfilled = true;
	ropb.m_arr = arr;
	while(obj.m_rops.length != 0 && obj.m_rops[0].m_fulfilled)
	{
		const ropb_curr = obj.m_rops.shift();
		obj.m_file_read_ful += ropb_curr.m_len;
		console.assert(obj.m_file_read_ful <= obj.m_file_read_req);
		obj.m_on_progress(obj);
		mkcc_read_on_req_finished_b(obj, ropb_curr, next);
	}
}

function mkcc_read_start(obj, next_pa)
{
	const next = function(){ next_pa(next_pa); };
	while(obj.m_rops.length != obj.m_rops_cnt && obj.m_file_read_req != obj.m_file.size)
	{
		const file_size = obj.m_file.size;
		const file_pos_cur = obj.m_file_read_req;
		const file_rem = file_size - file_pos_cur;
		const chunk_size_max = obj.m_data.byteLength;
		const chunk_size = Math.min(chunk_size_max, file_rem);
		const is_last = chunk_size == file_rem;
		const file_pos_new = file_pos_cur + chunk_size;
		const file_slice = obj.m_file.slice(file_pos_cur, file_pos_new);
		const rop = file_slice.arrayBuffer();
		const ropb = { m_rop: rop, m_start: file_pos_cur, m_len: chunk_size, m_last: is_last, m_fulfilled: false, m_arr: null, };
		obj.m_rops.push(ropb);
		obj.m_file_read_req += chunk_size;
		console.assert(obj.m_file_read_req >= obj.m_file_read_ful);
		obj.m_on_progress(obj);
		rop.then( function(arr){ mkcc_read_on_req_finished_a(obj, ropb, arr, next); } );
	}
}

function mkcc_init_append_num_1(buff, num)
{
	console.assert(num >= 0x00 && num <= 0xff);
	const len = 1;
	console.assert(buff.length >= len);
	const buff_num_1 = new Uint8Array(buff.buffer, buff.byteOffset, len);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
	buff_num_1[0] = num & 0xff;
	return buff_next;
}

function mkcc_init_append_num_4(buff_in, num)
{
	let buff = buff_in;
	for(let i = 0; i != 4; ++i)
	{
		const nm = (num >> (i * 8)) & 0xff;
		buff = mkcc_init_append_num_1(buff, nm);
	}
	return buff;
}

function mkcc_init_append_str_base(buff, str)
{
	const len = str.byteLength;
	console.assert(buff.length >= len);
	new Uint8Array(buff.buffer, buff.byteOffset, len).set(new Uint8Array(str.buffer, str.byteOffset, len), 0);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
	return buff_next;
}

function mkcc_init_append_str_id(buff_in, str)
{
	let buff = buff_in;
	console.assert(str.byteLength >= 0x01 && str.byteLength <= 0xff);
	buff = mkcc_init_append_num_1(buff, str.byteLength);
	buff = mkcc_init_append_str_base(buff, str);
	return buff;
}

function mkcc_init_append_str(buff_in, str)
{
	let buff = buff_in;
	console.assert(str.byteLength >= 0 && str.byteLength <= 4 * 1024);
	buff = mkcc_init_append_num_4(buff, str.byteLength);
	buff = mkcc_init_append_str_base(buff, str);
	return buff;
}

function mkcc_init_append_rnd(buff, obj)
{
	const len = obj.m_iv_size_max;
	console.assert(buff.length >= len);
	const buff_rnd = new Uint8Array(buff.buffer, buff.byteOffset, len);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
	if(obj.m_direction)
	{
		window.crypto.getRandomValues(buff_rnd);
		obj.m_iv = buff_rnd;
	}
	else
	{
		buff_rnd.set(obj.m_iv, 0);
	}
	return buff_next;
}

function mkcc_init_append_main(obj)
{
	let buff = obj.m_data;
	buff = mkcc_init_append_str_id(buff, obj.m_alg);
	buff = mkcc_init_append_str_id(buff, obj.m_padding);
	buff = mkcc_init_append_str_id(buff, obj.m_mode);
	buff = mkcc_init_append_str_id(buff, obj.m_kdf);
	buff = mkcc_init_append_rnd   (buff, obj);
	buff = mkcc_init_append_num_4 (buff, obj.m_cost);
	buff = mkcc_init_append_str   (buff, obj.m_password);
	buff = mkcc_init_append_str   (buff, obj.m_salt);
	const iv_len = obj.m_wi.exports.mkcc_init();
	if(!(iv_len >= 0x00 && iv_len <= obj.m_iv_size_max)) return -1;
	return iv_len;
}

function mkcc_process(obj)
{
	const iv_len = mkcc_init_append_main(obj); if(iv_len == -1) return;
	obj.m_iv = new Uint8Array(obj.m_iv.buffer, obj.m_iv.byteOffset, iv_len);
	obj.m_wops_cnt = 32;
	obj.m_rops_cnt = 32;
	obj.m_wops = [];
	obj.m_rops = [];
	obj.m_file_read_req = obj.m_direction ? 0 : iv_len;
	obj.m_file_read_ful = obj.m_direction ? 0 : iv_len;
	obj.m_file_write_req = 0;
	obj.m_file_write_ful = 0;
	const next_pa = function(next_p){ mkcc_read_start(obj, next_p); };
	const next = function(){ next_pa(next_pa); };
	if(obj.m_direction)
	{
		mkcc_write_append(obj, obj.m_iv, next);
	}
	else
	{
		next();
	}
}

function mkcc_file_iv_read_on_finished(obj, arr)
{
	console.assert(arr.byteLength == obj.m_iv_size_max);
	obj.m_iv = new Uint8Array(obj.m_iv_size_max);
	obj.m_iv.set(new Uint8Array(arr, 0, obj.mkcc_get_iv_size_max), 0);
	mkcc_process(obj);
}

function mkcc_refresh_impl(obj)
{
	document.getElementById("progress").value = 0;
	const iv_size_max = obj.m_wi.exports.mkcc_get_iv_size_max();
	console.assert(iv_size_max >= 0x01 && iv_size_max <= 0xff);
	obj.m_iv_size_max = iv_size_max;
	if(obj.m_direction)
	{
		mkcc_process(obj);
	}
	else
	{
		if(!(obj.m_file.size >= obj.m_iv_size_max)) return;
		const file_slice = obj.m_file.slice(0, obj.m_iv_size_max);
		const rop = file_slice.arrayBuffer();
		rop.then( function(arr){ mkcc_file_iv_read_on_finished(obj, arr); } );
	}
}

function mkcc_refresh(obj)
{
	obj.m_cancel = false;
	obj.m_next = null;
	if(!g_mkcc)
	{
		g_mkcc = obj;
		mkcc_refresh_impl(g_mkcc);
	}
	else
	{
		g_mkcc.m_next = obj;
		g_mkcc.m_cancel = true;
		g_mkcc = obj;
	}
}

function mkcc_save_file_on_writable(obj, fswfs)
{
	const wsdw = fswfs.getWriter();
	obj.m_wsdw = wsdw;
	mkcc_refresh(obj);
}

function mkcc_save_file_on_selected(obj, fsfh)
{
	const fswfsp = fsfh.createWritable();
	fswfsp.then( function(fswfs){ mkcc_save_file_on_writable(obj, fswfs); } );
}

function mkcc_save_file_run(obj)
{
	const fsfhp = window.showSaveFilePicker();
	fsfhp.then( function(fsfh){ mkcc_save_file_on_selected(obj, fsfh); }, function(err){ console.log(err); } );
}

function mkcc_get_num(name, min_val, def_val, max_val)
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

function mkcc_get_text(name)
{
	const element = document.getElementById(name);
	const buff = new Uint8Array(4 * 1024);
	const len = new TextEncoder().encodeInto(element.value, buff).written;
	const buff_smol = new Uint8Array(len);
	buff_smol.set(new Uint8Array(buff.buffer, 0, len), 0);
	return buff_smol;
}

function mkcc_get_select(name)
{
	const element = document.getElementById(name);
	const buff = new Uint8Array(0xff);
	const len = new TextEncoder().encodeInto(element.value, buff).written;
	const buff_smol = new Uint8Array(len);
	buff_smol.set(new Uint8Array(buff.buffer, 0, len), 0);
	return buff_smol;
}

function mkcc_get_args(obj)
{
	const file_e = document.getElementById("file");
	const is_file = file_e.value != ""; if(!is_file) return false;
	const alg      = mkcc_get_select("alg");
	const padding  = mkcc_get_select("padding");
	const mode     = mkcc_get_select("mode");
	const kdf      = mkcc_get_select("kdf");
	const password = mkcc_get_text("password");
	const salt     = mkcc_get_text("salt");
	const cost     = mkcc_get_num("cost", 1, 1000, 4294967295);
	obj.m_file = file_e.files[0];
	obj.m_alg = alg;
	obj.m_padding = padding;
	obj.m_mode = mode;
	obj.m_kdf = kdf;
	obj.m_password = password;
	obj.m_salt = salt;
	obj.m_cost = cost;
	return true;
}

function mkcc_go(obj)
{
	if(mkcc_get_args(obj) === false) return;
	mkcc_save_file_run(obj);
}

function mkcc_form_on_submit(obj)
{
}

function mkcc_encrypt_on_click(obj)
{
	obj.m_direction = true;
	mkcc_go(obj);
}

function mkcc_decrypt_on_click(obj)
{
	obj.m_direction = false;
	mkcc_go(obj);
}

function mkcc_on_closed(obj)
{
	console.assert(obj.m_file_read_ful == obj.m_file_read_req);
	console.assert(obj.m_file_write_ful == obj.m_file_write_req);
	const str = "Done.";
	document.getElementById("result_p").textContent = str;
	document.getElementById("progress").value = 100.0;
	document.getElementById("result_o").hidden = false;
	g_mkcc = obj.m_next;
	if(g_mkcc)
	{
		mkcc_refresh_impl(g_mkcc);
	}
}

function mkcc_gimme_progress(obj)
{
	console.assert(obj.m_file_read_req >= obj.m_file_read_ful);
	console.assert(obj.m_file_write_req >= obj.m_file_write_ful);
	console.assert(obj.m_iv.byteLength >= 0x0 && obj.m_iv.byteLength <= 0xff);
	console.assert(obj.m_iv.byteLength >= 0x0 && obj.m_iv.byteLength <= obj.m_iv_size_max);
	const iv_len = obj.m_iv.byteLength;
	const msg_len = obj.m_alg.length == 3 ? 8 : 16; /* todo smarter */
	const file_len = obj.m_file.size;
	let sum_complete_w = 0;
	if(obj.m_direction)
	{
		const file_rounded = Math.floor(file_len / msg_len) * msg_len;
		const pad_len = file_len == file_rounded ? msg_len : (file_len - file_rounded);
		sum_complete_w += 2 * iv_len;
		sum_complete_w += 2 * file_len;
		sum_complete_w += 2 * file_len;
		sum_complete_w += 2 * pad_len;
	}
	else
	{
		sum_complete_w += 2 * file_len;
		sum_complete_w += 2 * (file_len - iv_len);
	}
	const sum_complete = sum_complete_w;
	const sum_done = obj.m_file_read_req + obj.m_file_write_req + obj.m_file_read_ful + obj.m_file_write_ful;
	const percent = (sum_done * 100.0) / sum_complete;
	return percent;
}

function mkcc_on_progress(obj)
{
	const percent = mkcc_gimme_progress(obj);
	const rounded = Math.round(percent * 100.0) / 100.0;
	const str = percent.toFixed(2) + " %";
	console.assert(rounded >= document.getElementById("progress").value);
	document.getElementById("result_p").textContent = str;
	document.getElementById("progress").value = rounded;
	document.getElementById("result_o").hidden = false;
}

function mkcc_on_end(obj)
{
	const percent = mkcc_gimme_progress(obj);
	const rounded = Math.round(percent * 100.0) / 100.0;
	const str = percent.toFixed(2) + " %, closing file.";
	console.assert(rounded >= document.getElementById("progress").value);
	document.getElementById("result_p").textContent = str;
	document.getElementById("progress").value = rounded;
	document.getElementById("result_o").hidden = false;
	const cp = obj.m_wsdw.close();
	cp.then( function(){ mkcc_on_closed(obj); } );
}

function mkcc_populate_events(obj)
{
	const form = document.getElementById("form");
	const encrypt = document.getElementById("encrypt");
	const decrypt = document.getElementById("decrypt");
	form.addEventListener("submit", function(event){ event.preventDefault(); mkcc_form_on_submit(obj); return false; })
	encrypt.addEventListener("click", function(){ mkcc_encrypt_on_click(obj); } );
	decrypt.addEventListener("click", function(){ mkcc_decrypt_on_click(obj); } );
	obj.m_on_progress = function(o){ mkcc_on_progress(o); };
	obj.m_on_end = function(o){ mkcc_on_end(o); };
}

function mkcc_populate_name(name, strs)
{
	console.assert(strs.m_code.length == strs.m_pretty.length);
	const elem = document.getElementById(name);
	for(let i = 0; i != strs.m_code.length; ++i)
	{
		elem.add(new Option(strs.m_pretty[i], strs.m_code[i]), undefined);
	}
}

function mkcc_read_numo(buff)
{
	const len = 1;
	console.assert(len <= buff.length);
	const buff_num_1 = new Uint8Array(buff.buffer, buff.byteOffset, len);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
	const num = buff_num_1[0] & 0xff;
	const num_buff =
	{
		m_num: num,
		m_buff_next: buff_next,
	};
	return num_buff;
}

function mkcc_read_nums(buff_in, cnt)
{
	let nums = [];
	let buff = buff_in;
	for(let i = 0; i != cnt; ++i)
	{
		const num_buff = mkcc_read_numo(buff); if(num_buff === false) return false; const num = num_buff.m_num; buff = num_buff.m_buff_next;
		nums.push(num);
	}
	const nums_buff =
	{
		m_nums: nums,
		m_buff_next: buff,
	};
	return nums_buff;
}

function mkcc_read_str(buff, cnt)
{
	console.assert(cnt <= buff.length);
	const buff_str = new Uint8Array(buff.buffer, buff.byteOffset, cnt);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + cnt, buff.byteLength - cnt);
	const str = new TextDecoder().decode(buff_str);
	const str_buff =
	{
		m_str: str,
		m_buff_next: buff_next,
	};
	return str_buff;
}

function mkcc_read_strs(buff_in, cnt)
{
	let strs = [];
	let buff = buff_in;
	const lens_buff = mkcc_read_nums(buff, cnt); if(lens_buff === false) return false; const lens = lens_buff.m_nums; buff = lens_buff.m_buff_next;
	for(let i = 0; i != cnt; ++i)
	{
		const str_buff = mkcc_read_str(buff, lens[i]); if(str_buff === false) return false; const str = str_buff.m_str; buff = str_buff.m_buff_next;
		strs.push(str);
	}
	const strs_buff =
	{
		m_strs: strs,
		m_buff_next: buff,
	};
	return strs_buff;
}

function mkcc_sort(items, order)
{
	console.assert(items.length == order.length);
	let itms = [];
	for(let i = 0; i != items.length; ++i)
	{
		console.assert(order[i] >= 0 && order[i] < items.length);
		itms.push(items[order[i]]);
	}
	return itms;
}

function mkcc_read_names(buff_in)
{
	let buff = buff_in;
	const cnt_buff    = mkcc_read_numo(buff     ); if(cnt_buff    === false) return false; const cnt    = cnt_buff   .m_num ; buff = cnt_buff   .m_buff_next;
	const order_buff  = mkcc_read_nums(buff, cnt); if(order_buff  === false) return false; const order  = order_buff .m_nums; buff = order_buff .m_buff_next;
	const codes_buff  = mkcc_read_strs(buff, cnt); if(codes_buff  === false) return false; const code   = codes_buff .m_strs; buff = codes_buff .m_buff_next;
	const pretty_buff = mkcc_read_strs(buff, cnt); if(pretty_buff === false) return false; const pretty = pretty_buff.m_strs; buff = pretty_buff.m_buff_next;
	console.assert(order .length == cnt);
	console.assert(code  .length == cnt);
	console.assert(pretty.length == cnt);
	const code_ordered   = mkcc_sort(code  , order);
	const pretty_ordered = mkcc_sort(pretty, order);
	const names_buff =
	{
		m_strs:
		{
			m_code  : code_ordered  ,
			m_pretty: pretty_ordered,
		},
		m_buff_next: buff,
	};
	return names_buff;
}

function mkcc_get_names(obj)
{
	const data_size_desired = 64 * 1024;
	const data_addr = obj.m_wi.exports.mkcc_get_data_addr(); if(!(data_addr != 0                         )) return false;
	const data_size = obj.m_wi.exports.mkcc_get_data_size(); if(!(data_size >= data_size_desired         )) return false;
	const names_len = obj.m_wi.exports.mkcc_get_names    (); if(!(names_len >= 0 && names_len <= 4 * 1024)) return false;
	let buff = new Uint8Array(obj.m_wi.exports.memory.buffer, data_addr, names_len);
	const alg_names_buff     = mkcc_read_names(buff); if(alg_names_buff     === false) return false; const alg_names     = alg_names_buff    .m_strs; buff = alg_names_buff    .m_buff_next;
	const padding_names_buff = mkcc_read_names(buff); if(padding_names_buff === false) return false; const padding_names = padding_names_buff.m_strs; buff = padding_names_buff.m_buff_next;
	const mode_names_buff    = mkcc_read_names(buff); if(mode_names_buff    === false) return false; const mode_names    = mode_names_buff   .m_strs; buff = mode_names_buff   .m_buff_next;
	const kdf_names_buff     = mkcc_read_names(buff); if(kdf_names_buff     === false) return false; const kdf_names     = kdf_names_buff    .m_strs; buff = kdf_names_buff    .m_buff_next;
	if(!(buff.byteLength == 0)) return false;
	obj.m_data = new Uint8Array(obj.m_wi.exports.memory.buffer, data_addr, data_size_desired);
	const names =
	{
		m_alg_names    : alg_names    ,
		m_padding_names: padding_names,
		m_mode_names   : mode_names   ,
		m_kdf_names    : kdf_names    ,
	};
	return names;
}

function mkcc_populate_names(obj)
{
	const names = mkcc_get_names(obj); if(names === false) return false;
	mkcc_populate_name("alg"    , names.m_alg_names    );
	mkcc_populate_name("padding", names.m_padding_names);
	mkcc_populate_name("mode"   , names.m_mode_names   );
	mkcc_populate_name("kdf"    , names.m_kdf_names    );
	return true;
}

function mkcc_on_wasm_loaded(obj, wm)
{
	const wi = wm.instance;
	obj.m_wi = wi;
	if(mkcc_populate_names(obj) === false) return;
	mkcc_populate_events(obj);
}

function mkcc_run(obj)
{
	const fp = fetch("mkcc.wasm");
	const wp = WebAssembly.instantiateStreaming(fp);
	wp.then( function(wm){ mkcc_on_wasm_loaded(obj, wm); } );
}

function mkcc_make()
{
	const obj =
	{
		m_cancel: null,
		m_next: null,
		m_wi: null,
		m_data: null,
		m_direction: null,
		m_file: null,
		m_alg: null,
		m_padding: null,
		m_mode: null,
		m_kdf: null,
		m_password: null,
		m_salt: null,
		m_cost: null,
		m_wsdw: null,
		m_iv_size_max: null,
		m_iv: null,
		m_file_read_req: null,
		m_file_read_ful: null,
		m_file_write_req: null,
		m_file_write_ful: null,
		m_wops_cnt: null,
		m_rops_cnt: null,
		m_wops: null,
		m_rops: null,
		m_on_progress: null,
		m_on_end: null,
	};
	return obj;
}

function mkcc_on_window_loaded()
{
	const obj = mkcc_make();
	mkcc_run(obj);
}

function mkcc_start()
{
	window.addEventListener("load", mkcc_on_window_loaded);
}

mkcc_start();
