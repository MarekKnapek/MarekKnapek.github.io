"use strict";

let g_analyzer;

function half_mylog(a, b)
{
  return Math.log(b) / Math.log(a);
}

function half_on_changed(bit, idx)
{
	const flt_bits = 16;
	const flt_mts_bits = 10;
	const flt_exp_bits = flt_bits - flt_mts_bits - 1;
	const flt_exp_type = Math.ceil(flt_exp_bits / 8) * 8;
	const bin_offset = flt_bits / 8;
	const bin_len = flt_bits;
	const hex_offset = bin_offset + bin_len;
	const hex_len = flt_bits / 4;
	const uns_offset = hex_offset + hex_len + 1;
	const uns_len = Math.ceil(half_mylog(10, Math.pow(2, flt_bits)));
	const sig_offset = uns_offset + uns_len + 1;
	const sig_len = uns_len + 1;
	const sgn_offset = sig_offset + sig_len;
	const sgn_len = 1;
	const exp_bin_off = sgn_offset + sgn_len;
	const exp_bin_len = flt_exp_type;
	const exp_hex_off = exp_bin_off + exp_bin_len;
	const exp_hex_len = Math.ceil(flt_exp_bits / 8) * 2;
	const exp_dec_off = exp_hex_off + exp_hex_len + 1;
	const exp_dec_len = Math.ceil(half_mylog(10, Math.pow(2, Math.ceil(flt_exp_bits / 8) * 8)));
	const exp_dcd_off = exp_dec_off + exp_dec_len + 1;
	const exp_dcd_len = exp_dec_len + 1;
	const type_off = exp_dcd_off + exp_dcd_len;
	const type_len = 1;
	const one_off = type_off + type_len;
	const one_len = 1;
	const mts_bin_off = one_off + one_len;
	const mts_bin_len = flt_bits;
	const mts_hex_off = mts_bin_off + mts_bin_len;
	const mts_hex_len = flt_bits / 4;
	const mts_dec_off = mts_hex_off + mts_hex_len + 1;
	const mts_dec_len = uns_len;
	const mts_dcd_off = mts_dec_off + mts_dec_len + 1;
	const mts_dcd_len = 1 + 1 + flt_mts_bits;
	const val_offset = mts_dcd_off + mts_dcd_len + 1;
	const val_len = 27;

	const byte_idx = Math.floor(idx / 8);
	const bit_idx = idx % 8;
	if(bit.checked)
	{
		g_analyzer.arr[byte_idx] = g_analyzer.arr[byte_idx] | (1 << bit_idx);
	}
	else
	{
		g_analyzer.arr[byte_idx] = g_analyzer.arr[byte_idx] &~ (1 << bit_idx);
	}
	const analyzer = g_analyzer.wi.exports.half_analyzer_analyze(g_analyzer.arr[0], g_analyzer.arr[1], g_analyzer.arr[2], g_analyzer.arr[3]);
	const bin_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + bin_offset, analyzer + bin_offset + bin_len); const binstr = new TextDecoder().decode(bin_buf);
	const hex_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + hex_offset, analyzer + hex_offset + hex_len); const hexstr = new TextDecoder().decode(hex_buf);
	const le1_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + uns_offset - 1, analyzer + uns_offset + 0);
	const uns_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + uns_offset, analyzer + uns_offset + new Uint8Array(le1_buf)[0]); const unsstr = new TextDecoder().decode(uns_buf);
	const le2_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + sig_offset - 1, analyzer + sig_offset + 0);
	const sig_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + sig_offset, analyzer + sig_offset + new Uint8Array(le2_buf)[0]); const sigstr = new TextDecoder().decode(sig_buf);
	const sgn_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + sgn_offset, analyzer + sgn_offset + 1); const sgn_val = new Uint8Array(sgn_buf); console.assert(sgn_val == 0 || sgn_val == 1); const sgn_str = sgn_val == 0 ? "Positive" : "Negative";
	const exp_bin_buff = g_analyzer.wi.exports.memory.buffer.slice(analyzer + exp_bin_off + (flt_exp_type - flt_exp_bits), analyzer + exp_bin_off + (flt_exp_type - flt_exp_bits) + flt_exp_bits); const exp_bin_str = new TextDecoder().decode(exp_bin_buff);
	const exp_hex_buff = g_analyzer.wi.exports.memory.buffer.slice(analyzer + exp_hex_off + (flt_exp_type / 4 - Math.ceil(flt_exp_bits / 4)), analyzer + exp_hex_off + (flt_exp_type / 4 - Math.ceil(flt_exp_bits / 4)) + Math.ceil(flt_exp_bits / 4)); const exp_hex_str = new TextDecoder().decode(exp_hex_buff);
	const le3_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + exp_dec_off - 1, analyzer + exp_dec_off + 0);
	const exp_dec_buff = g_analyzer.wi.exports.memory.buffer.slice(analyzer + exp_dec_off, analyzer + exp_dec_off + new Uint8Array(le3_buf)[0]); const exp_dec_str = new TextDecoder().decode(exp_dec_buff);
	const le4_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + exp_dcd_off - 1, analyzer + exp_dcd_off + 0);
	const exp_dcd_buff = g_analyzer.wi.exports.memory.buffer.slice(analyzer + exp_dcd_off, analyzer + exp_dcd_off + new Uint8Array(le4_buf)[0]); const exp_dcd_str = new TextDecoder().decode(exp_dcd_buff);
	const type_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + type_off, analyzer + type_off + 1); const type_val = new Uint8Array(type_buf); console.assert(type_val >= 0 || type_val <= 4); const type_str = type_val == 0 ? "Zero" : (type_val == 1 ? "Denormal" : (type_val == 2 ? "Infinity" : (type_val == 3 ? "NaN" : "Normal")));
	const one_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + one_off, analyzer + one_off + 1); const one_val = new Uint8Array(one_buf); console.assert(one_val == 0 || one_val == 1); const one_str = (type_val == 1 || type_val == 4) ? ((one_val == 0) ? "No" : "Yes") : "n/a";
	const mts_bin_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + mts_bin_off + (flt_bits - flt_mts_bits), analyzer + mts_bin_off + (flt_bits - flt_mts_bits) + flt_mts_bits); const mts_bin_str = new TextDecoder().decode(mts_bin_buf);
	const mts_hex_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + mts_hex_off + (flt_bits / 8 * 2 - Math.ceil(flt_mts_bits / 4)), analyzer + mts_hex_off + (flt_bits / 8 * 2 - Math.ceil(flt_mts_bits / 4)) + Math.ceil(flt_mts_bits / 4)); const mts_hex_str = new TextDecoder().decode(mts_hex_buf);
	const le5_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + mts_dec_off - 1, analyzer + mts_dec_off + 0);
	const mts_dec_buff = g_analyzer.wi.exports.memory.buffer.slice(analyzer + mts_dec_off, analyzer + mts_dec_off + new Uint8Array(le5_buf)[0]); const mts_dec_str = new TextDecoder().decode(mts_dec_buff);
	const le6_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + mts_dcd_off - 1, analyzer + mts_dcd_off + 0);
	const mts_dcd_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + mts_dcd_off, analyzer + mts_dcd_off + new Uint8Array(le6_buf)[0]); const mts_dcd_str = new TextDecoder().decode(mts_dcd_buf);
	const le7_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + val_offset - 1, analyzer + val_offset + 0);
	const val_buf = g_analyzer.wi.exports.memory.buffer.slice(analyzer + val_offset, analyzer + val_offset + new Uint8Array(le7_buf)[0]); const valstr = new TextDecoder().decode(val_buf);
	document.getElementById("o_bin").textContent = binstr;
	document.getElementById("o_hex").textContent = hexstr;
	document.getElementById("o_uns").textContent = unsstr;
	document.getElementById("o_sig").textContent = sigstr;
	document.getElementById("o_sgn").textContent = sgn_str;
	document.getElementById("o_exp_bin").textContent = exp_bin_str;
	document.getElementById("o_exp_hex").textContent = exp_hex_str;
	document.getElementById("o_exp_dec").textContent = exp_dec_str;
	document.getElementById("o_exp_dcd").textContent = exp_dcd_str;
	document.getElementById("o_type").textContent = type_str;
	document.getElementById("o_one").textContent = one_str;
	document.getElementById("o_mts_bin").textContent = mts_bin_str;
	document.getElementById("o_mts_hex").textContent = mts_hex_str;
	document.getElementById("o_mts_dec").textContent = mts_dec_str;
	document.getElementById("o_mts_dcd").textContent = mts_dcd_str;
	document.getElementById("o_val").textContent = valstr;
}

function half_set_events()
{
	const n = 16;
	for(let i = 0; i != n; ++i)
	{
		const id = "bit" + i;
		const bit = document.getElementById(id);
		bit.addEventListener("change", function(){ half_on_changed(bit, i); });
	}
}

function half_trigger_event()
{
	const bit = document.getElementById("bit0");
	half_on_changed(bit, 0);
}

function half_parse_url()
{
	const f = new URL(window.location.href).hash;
	if
	(
		f.length >= 6 + 1 &&
		f.length <= 6 + 4 * 2 &&
		f[0] == '#' &&
		f[1] == '?' &&
		f[2] == 'n' &&
		f[3] == '=' &&
		f[4] == '0' &&
		f[5] == 'x' &&
		true
	)
	{
		const symbols = "0123456789abcdef";
		let bits_arr = Array(16);
		let bits_cnt = 0;
		const h = f.substring(6, f.length).toLowerCase();
		const n = h.length;
		for(let i = 0; i != n; ++i)
		{
			const idx = (n - 1) - i;
			const digit = symbols.indexOf(f[6 + idx]);
			if(digit == -1)
			{
				return;
			}
			for(let j = 0; j != 4; ++j)
			{
				const bit = ((digit >> j) & 0x1) != 0;
				bits_arr[i * 4 + j] = bit;
				++bits_cnt;
			}
		}
		for(let i = 0; i != bits_cnt; ++i)
		{
			const eid = "bit" + i;
			const ebit = document.getElementById(eid);
			ebit.checked = bits_arr[i];
			half_on_changed(document.getElementById("bit" + i), i);
		}
	}
}

function half_on_wasm_loaded(wm)
{
	const wi = wm.instance;
	g_analyzer.wm = wm;
	g_analyzer.wi = wi;
	half_set_events();
	half_trigger_event();
	half_parse_url();
}

function half_fetch_wasm()
{
	const fp = fetch("half.wasm");
	const wp = WebAssembly.instantiateStreaming(fp);
	wp.then(function(wm){ half_on_wasm_loaded(wm); });
}

function half_make_checkboxes()
{
	const bits_all = 16;
	const bits_mts = 10;
	const bits_exp = bits_all - 1 - bits_mts;

	const table_sign = document.getElementById("sign");
	const row_sign = table_sign.children[0].children[0];
	const bit = document.createElement("input");
	bit.setAttribute("type", "checkbox");
	bit.setAttribute("id", "bit" + (bits_all - 1));
	row_sign.appendChild(bit);
	const table_exp = document.getElementById("exp");
	const row_exp = table_exp.children[0].children[0];
	for(let i = 0; i != bits_exp; ++i)
	{
		const bit = document.createElement("input");
		bit.setAttribute("type", "checkbox");
		bit.setAttribute("id", "bit" + (bits_all - 1 - 1 - i));
		row_exp.appendChild(bit);
	}
	const table_mts = document.getElementById("mts");
	const row_mts = table_mts.children[0].children[0];
	for(let i = 0; i != bits_mts; ++i)
	{
		const bit = document.createElement("input");
		bit.setAttribute("type", "checkbox");
		bit.setAttribute("id", "bit" + (bits_all - 1 - 1 - bits_exp - i));
		row_mts.appendChild(bit);
	}
}

function half_init()
{
	const n = 2;
	g_analyzer =
	{
		arr: new Array(n),
		wm: null,
		wi: null,
	};
	for(let i = 0; i != n; ++i)
	{
		g_analyzer.arr[i] = 0;
	}
}

function half_on_window_loaded()
{
	half_init();
	half_make_checkboxes();
	half_fetch_wasm();
}

function half_start()
{
	window.addEventListener("load", half_on_window_loaded);
}

half_start();
