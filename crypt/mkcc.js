"use strict";


let g_mkcc_obj = null;


function mkcc_init_append_num_1(buff, num)
{
	console.assert(num >= 0x00 && num <= 0xff);
	const len = 1;
	const buff_num_1 = new Uint8Array(buff.buffer, buff.byteOffset, len);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
	buff_num_1[0] = num & 0xff;
	return buff_next;
}

function mkcc_init_append_num_4(buff_, num)
{
	let buff = buff_;
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
	new Uint8Array(buff.buffer, buff.byteOffset, len).set(new Uint8Array(str.buffer, str.byteOffset, len), 0);
	const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
	return buff_next;
}

function mkcc_init_append_str_id(buff_, str)
{
	let buff = buff_;
	console.assert(str.byteLength >= 0x01 && str.byteLength <= 0xff);
	buff = mkcc_init_append_num_1(buff, str.byteLength);
	buff = mkcc_init_append_str_base(buff, str);
	return buff;
}

function mkcc_init_append_str(buff_, str)
{
	let buff = buff_;
	console.assert(str.byteLength >= 0 && str.byteLength <= 4 * 1024);
	buff = mkcc_init_append_num_4(buff, str.byteLength);
	buff = mkcc_init_append_str_base(buff, str);
	return buff;
}

function mkcc_init_append_rnd(buff, obj)
{
	const len = obj.m_iv_size_max;
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


function mkcc_write_add_req(obj, buff, next)
{
	console.assert(obj.m_wops.length != obj.m_wops_cnt);
	const wop = obj.m_wsdw.write(buff);
	const wopb = { m_wop: wop, m_buff: buff, };
	obj.m_wops.push(wopb);
	obj.m_file_write_req += buff.byteLength;
	console.assert(obj.m_file_write_req >= obj.m_file_write_ful);
	obj.m_on_progress();
	next();
}

function mkcc_write_on_req_finished(obj, next)
{
	console.assert(obj.m_wops.length != 0);
	const wopb = obj.m_wops.shift();
	obj.m_file_write_ful += wopb.m_buff.byteLength;
	console.assert(obj.m_file_write_ful <= obj.m_file_write_req);
	obj.m_on_progress();
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
	const next = function(){ mkcc_write_wait_all(obj, self, obj.m_on_end); };
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
	const next = function(){ mkcc_write_wait_all(obj, self, obj.m_on_end); };
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
		obj.m_on_progress();
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
		obj.m_on_progress();
		rop.then( function(arr){ mkcc_read_on_req_finished_a(obj, ropb, arr, next); } );
	}
}


function mkcc_process(obj)
{
	const iv_len = mkcc_init_append_main(obj); if(iv_len == -1) return;
	obj.m_iv = new Uint8Array(obj.m_iv.buffer, obj.m_iv.byteOffset, iv_len);
	obj.m_wops_cnt = 8;
	obj.m_rops_cnt = 8;
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

function mkcc_refresh_impl(obj)
{
	const iv_size_max = obj.m_wi.exports.mkcc_get_iv_size_max();
	if(!(iv_size_max >= 0x01 && iv_size_max <= 0xff)) return;
	obj.m_iv_size_max = iv_size_max;
	if(!obj.m_direction)
	{
		if(!(obj.m_file.size >= obj.m_iv_size_max)) return;
		const file_slice = obj.m_file.slice(0, obj.m_iv_size_max);
		const rop = file_slice.arrayBuffer();
		rop.then(function(arr)
		{
			console.assert(arr.byteLength == obj.m_iv_size_max);
			obj.m_iv = new Uint8Array(obj.m_iv_size_max);
			obj.m_iv.set(new Uint8Array(arr, 0, obj.mkcc_get_iv_size_max), 0);
			mkcc_process(obj);
		});
	}
	else
	{
		mkcc_process(obj);
	}
}

function mkcc_refresh(obj)
{
	obj.m_cancel = false;
	obj.m_next = null;
	if(!g_mkcc_obj)
	{
		g_mkcc_obj = obj;
		mkcc_refresh_impl(g_mkcc_obj);
	}
	else
	{
		g_mkcc_obj.m_next = obj;
		g_mkcc_obj.m_cancel = true;
		g_mkcc_obj = obj;
	}
}


function mkcc_on_window_loaded()
{
	const on_start = function(obj)
	{
		const on_wasm_loaded = function(obj, wm)
		{
			const populate_names = function(obj)
			{
				const get_names = function(obj)
				{
					const read_names = function(buff_in)
					{
						const read_num_1 = function(buff)
						{
							const len = 1;
							const buff_num_1 = new Uint8Array(buff.buffer, buff.byteOffset, len);
							const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + len, buff.byteLength - len);
							const num = buff_num_1[0] & 0xff;
							const num_buff =
							{
								m_num: num,
								m_buff_next: buff_next,
							};
							return num_buff;
						};
						const read_str = function(buff, cnt)
						{
							const buff_str = new Uint8Array(buff.buffer, buff.byteOffset, cnt);
							const buff_next = new Uint8Array(buff.buffer, buff.byteOffset + cnt, buff.byteLength - cnt);
							const str = new TextDecoder().decode(buff_str);
							const str_buff =
							{
								m_str: str,
								m_buff_next: buff_next,
							};
							return str_buff;
						};
						const read_nums_1 = function(buff_in, cnt)
						{
							let nums = [];
							let buff = buff_in;
							for(let i = 0; i != cnt; ++i)
							{
								const num_buff = read_num_1(buff); if(!num_buff) return false; const num = num_buff.m_num; buff = num_buff.m_buff_next;
								nums.push(num);
							}
							const nums_buff =
							{
								m_nums: nums,
								m_buff_next: buff,
							};
							return nums_buff;
						};
						const read_strs = function(buff_in, cnt)
						{
							let strs = [];
							let buff = buff_in;
							const lens_buff = read_nums_1(buff, cnt); if(!lens_buff) return false; const lens = lens_buff.m_nums; buff = lens_buff.m_buff_next;
							for(let i = 0; i != cnt; ++i)
							{
								const str_buff = read_str(buff, lens[i]); if(!str_buff) return false; const str = str_buff.m_str; buff = str_buff.m_buff_next;
								strs.push(str);
							}
							const strs_buff =
							{
								m_strs: strs,
								m_buff_next: buff,
							};
							return strs_buff;
						};
						const sort = function(items, order)
						{
							console.assert(items.length == order.length);
							let itms = [];
							for(let i = 0; i != items.length; ++i)
							{
								itms.push(items[order[i]]);
							}
							return itms;
						};
						let buff = buff_in;
						const cnt_buff    = read_num_1 (buff     ); if(!cnt_buff   ) return false; const cnt    = cnt_buff   .m_num ; buff = cnt_buff   .m_buff_next;
						const order_buff  = read_nums_1(buff, cnt); if(!order_buff ) return false; const order  = order_buff .m_nums; buff = order_buff .m_buff_next;
						const codes_buff  = read_strs  (buff, cnt); if(!codes_buff ) return false; const code   = codes_buff .m_strs; buff = codes_buff .m_buff_next;
						const pretty_buff = read_strs  (buff, cnt); if(!pretty_buff) return false; const pretty = pretty_buff.m_strs; buff = pretty_buff.m_buff_next;
						console.assert(code.length == pretty.length);
						const code_ordered   = sort(code  , order);
						const pretty_ordered = sort(pretty, order);
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
					};
					const data_addr = obj.m_wi.exports.mkcc_get_data_addr(); if(!(data_addr != 0                         )) return false;
					const data_size = obj.m_wi.exports.mkcc_get_data_size(); if(!(data_size >= 1 * 1024 * 1024           )) return false;
					const names_len = obj.m_wi.exports.mkcc_get_names    (); if(!(names_len >= 0 && names_len <= 4 * 1024)) return false;
					let buff = new Uint8Array(obj.m_wi.exports.memory.buffer, data_addr, names_len);
					const alg_names_buff     = read_names(buff); if(!alg_names_buff    ) return false; const alg_names     = alg_names_buff    .m_strs; buff = alg_names_buff    .m_buff_next;
					const padding_names_buff = read_names(buff); if(!padding_names_buff) return false; const padding_names = padding_names_buff.m_strs; buff = padding_names_buff.m_buff_next;
					const mode_names_buff    = read_names(buff); if(!mode_names_buff   ) return false; const mode_names    = mode_names_buff   .m_strs; buff = mode_names_buff   .m_buff_next;
					const kdf_names_buff     = read_names(buff); if(!kdf_names_buff    ) return false; const kdf_names     = kdf_names_buff    .m_strs; buff = kdf_names_buff    .m_buff_next;
					if(!(buff.byteLength == 0)) return false;
					obj.m_data = new Uint8Array(obj.m_wi.exports.memory.buffer, data_addr, data_size);
					const names =
					{
						m_alg_names    : alg_names    ,
						m_padding_names: padding_names,
						m_mode_names   : mode_names   ,
						m_kdf_names    : kdf_names    ,
					};
					return names;
				};
				const populate_name = function(name, strs)
				{
					console.assert(strs.m_code.length == strs.m_pretty.length);
					const elem = document.getElementById(name);
					for(let i = 0; i != strs.m_code.length; ++i)
					{
						elem.add(new Option(strs.m_pretty[i], strs.m_code[i]), undefined);
					}
				};
				const names = get_names(obj); if(!names) return false;
				populate_name("alg"    , names.m_alg_names    );
				populate_name("padding", names.m_padding_names);
				populate_name("mode"   , names.m_mode_names   );
				populate_name("kdf"    , names.m_kdf_names    );
				return true;
			};
			const populate_events = function(obj)
			{
				const refresh = function(obj)
				{
					const get_args = function(obj)
					{
						const get_select = function(name)
						{
							const element = document.getElementById(name);
							const buff = new Uint8Array(0xff);
							const len = new TextEncoder().encodeInto(element.value, buff).written;
							const buff_smol = new Uint8Array(len);
							buff_smol.set(new Uint8Array(buff.buffer, 0, len), 0);
							return buff_smol;
						};
						const get_text = function(name)
						{
							const element = document.getElementById(name);
							const buff = new Uint8Array(4 * 1024);
							const len = new TextEncoder().encodeInto(element.value, buff).written;
							const buff_smol = new Uint8Array(len);
							buff_smol.set(new Uint8Array(buff.buffer, 0, len), 0);
							return buff_smol;
						}
						const get_num = function(name, min_val, def_val, max_val)
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
							return val;
						};
						const file_e = document.getElementById("file");
						const is_file = file_e.value != ""; if(!is_file) return false;
						const alg      = get_select("alg");
						const padding  = get_select("padding");
						const mode     = get_select("mode");
						const kdf      = get_select("kdf");
						const password = get_text  ("password");
						const salt     = get_text  ("salt");
						const cost     = get_num   ("cost", 1, 1000, 4294967295);
						obj.m_file = file_e.files[0];
						obj.m_alg = alg;
						obj.m_padding = padding;
						obj.m_mode = mode;
						obj.m_kdf = kdf;
						obj.m_password = password;
						obj.m_salt = salt;
						obj.m_cost = cost;
						return true;
					};
					const get_sink_a = function(obj)
					{
						const get_sink_b = function(obj, fsfh)
						{
							const get_sink_c = function(obj, fswfs)
							{
								const wsdw = fswfs.getWriter();
								obj.m_wsdw = wsdw;
								mkcc_refresh(obj);
							};
							const fswfsp = fsfh.createWritable();
							fswfsp.then( function(fswfs){ get_sink_c(obj, fswfs); } );
						};
						const fsfhp = window.showSaveFilePicker();
						fsfhp.then( function(fsfh){ get_sink_b(obj, fsfh); }, function(err){ console.log(err); } );
					};
					if(!get_args(obj)) return;
					get_sink_a(obj);
				};
				const form_on_submit = function(obj)
				{
				};
				const encrypt_on_click = function(obj)
				{
					obj.m_direction = true;
					refresh(obj);
				};
				const decrypt_on_click = function(obj)
				{
					obj.m_direction = false;
					refresh(obj);
				};
				const state_gimme_progress = function(obj)
				{
					console.assert(obj.m_file_read_req >= obj.m_file_read_ful);
					console.assert(obj.m_file_write_req >= obj.m_file_write_ful);
					const sum_done = obj.m_file_read_req + obj.m_file_write_req + obj.m_file_read_ful + obj.m_file_write_ful;
					const sum_complete = 4 * obj.m_file.size + 2 * (obj.m_iv_size_max + obj.m_iv_size_max);
					const percent = (sum_done * 100.0) / sum_complete;
					return percent;
				};
				const state_on_progress = function(obj)
				{
					const percent = state_gimme_progress(obj);
					const str = percent.toFixed(2) + " %";
					document.getElementById("result_p").textContent = str;
					document.getElementById("progress").value = Math.floor(percent * 100.0) / 100.0;
					document.getElementById("result_o").hidden = false;
				};
				const state_on_closed = function()
				{
					console.assert(obj.m_file_read_ful == obj.m_file_read_req);
					console.assert(obj.m_file_write_ful == obj.m_file_write_req);
					const str = "Done.";
					document.getElementById("result_p").textContent = str;
					document.getElementById("progress").value = 100.0;
					document.getElementById("result_o").hidden = false;
					g_mkcc_obj = obj.m_next;
					if(g_mkcc_obj)
					{
						mkcc_refresh_impl(g_mkcc_obj);
					}
				};
				const state_on_end = function(obj)
				{
					const percent = state_gimme_progress(obj);
					const str = percent.toFixed(2) + " %, closing file.";
					document.getElementById("result_p").textContent = str;
					document.getElementById("progress").value = Math.floor(percent * 100.0) / 100.0;
					document.getElementById("result_o").hidden = false;
					const cp = obj.m_wsdw.close();
					cp.then( function(){ state_on_closed(obj); } );
				};
				const form = document.getElementById("form");
				const encrypt = document.getElementById("encrypt");
				const decrypt = document.getElementById("decrypt");
				form.addEventListener("submit", function(event){ event.preventDefault(); form_on_submit(obj); return false; })
				encrypt.addEventListener("click", function(){ encrypt_on_click(obj); } );
				decrypt.addEventListener("click", function(){ decrypt_on_click(obj); } );
				obj.m_on_progress = function(){ state_on_progress(obj); };
				obj.m_on_end = function(){ state_on_end(obj); };
			};
			const wi = wm.instance;
			obj.m_wi = wi;
			if(!populate_names(obj)) return;
			populate_events(obj);
		};
		const fp = fetch("mkcc.wasm");
		const wp = WebAssembly.instantiateStreaming(fp);
		wp.then( function(wm){ on_wasm_loaded(obj, wm); } );
	};
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
	on_start(obj);
}

function mkcc_start()
{
	window.onload = mkcc_on_window_loaded;
}

mkcc_start();
