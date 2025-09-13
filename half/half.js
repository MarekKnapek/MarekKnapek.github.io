"use strict";


function half_wasm_call_generic(analyzer, fn_id, arg)
{
	"use strict";
	return analyzer.wi.exports.majn(fn_id, arg);
}

function half_wasm_call_analyze(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 0, 0);
}

function half_wasm_call_get_buffer_buf(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 1, 0);
}

function half_wasm_call_get_buffer_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 2, 0);
}

function half_wasm_call_get_all_text_bin_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 3, 0);
}

function half_wasm_call_get_all_text_bin_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 4, 0);
}

function half_wasm_call_get_all_text_hex_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 5, 0);
}

function half_wasm_call_get_all_text_hex_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 6, 0);
}

function half_wasm_call_get_all_text_dec_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 7, 0);
}

function half_wasm_call_get_all_text_dec_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 8, 0);
}

function half_wasm_call_get_all_text_sgn_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 9, 0);
}

function half_wasm_call_get_all_text_sgn_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 10, 0);
}

function half_wasm_call_get_sign_text_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 11, 0);
}

function half_wasm_call_get_sign_text_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 12, 0);
}

function half_wasm_call_get_exponent_text_bin_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 13, 0);
}

function half_wasm_call_get_exponent_text_bin_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 14, 0);
}

function half_wasm_call_get_exponent_text_hex_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 15, 0);
}

function half_wasm_call_get_exponent_text_hex_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 16, 0);
}

function half_wasm_call_get_exponent_text_dec_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 17, 0);
}

function half_wasm_call_get_exponent_text_dec_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 18, 0);
}

function half_wasm_call_get_exponent_text_decoded_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 19, 0);
}

function half_wasm_call_get_exponent_text_decoded_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 20, 0);
}

function half_wasm_call_get_exponent_text_type_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 21, 0);
}

function half_wasm_call_get_exponent_text_type_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 22, 0);
}

function half_wasm_call_get_exponent_text_implied_one_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 23, 0);
}

function half_wasm_call_get_exponent_text_implied_one_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 24, 0);
}

function half_wasm_call_get_mantissa_text_bin_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 25, 0);
}

function half_wasm_call_get_mantissa_text_bin_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 26, 0);
}

function half_wasm_call_get_mantissa_text_hex_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 27, 0);
}

function half_wasm_call_get_mantissa_text_hex_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 28, 0);
}

function half_wasm_call_get_mantissa_text_dec_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 29, 0);
}

function half_wasm_call_get_mantissa_text_dec_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 30, 0);
}

function half_wasm_call_get_mantissa_text_dcd_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 31, 0);
}

function half_wasm_call_get_mantissa_text_dcd_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 32, 0);
}

function half_wasm_call_get_value_text_beg(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 33, 0);
}

function half_wasm_call_get_value_text_len(analyzer)
{
	"use strict";
	return half_wasm_call_generic(analyzer, 34, 0);
}

function half_on_changed(analyzer, bit, idx)
{
	"use strict";
	const byte_idx = Math.floor(idx / 8);
	const bit_idx = idx % 8;
	if(bit.checked)
	{
		analyzer.arr[byte_idx] = analyzer.arr[byte_idx] | (1 << bit_idx);
	}
	else
	{
		analyzer.arr[byte_idx] = analyzer.arr[byte_idx] &~ (1 << bit_idx);
	}
	const target_buf = half_wasm_call_get_buffer_buf(analyzer);
	const target_len = half_wasm_call_get_buffer_len(analyzer);
	const target_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, target_buf, target_len);
	const n = 16 / 8;
	for(let i = 0; i != n; ++i)
	{
		target_obj[i] = analyzer.arr[i];
	}
	const analyzed = half_wasm_call_analyze(analyzer);
	console.assert(analyzed == 0);

	const all_text_bin_beg = half_wasm_call_get_all_text_bin_beg(analyzer);
	const all_text_bin_len = half_wasm_call_get_all_text_bin_len(analyzer);
	const all_text_bin_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, all_text_bin_beg, all_text_bin_len);
	const all_text_bin_str = new TextDecoder().decode(all_text_bin_obj);
	document.getElementById("o_bin").textContent = all_text_bin_str;
	const all_text_hex_beg = half_wasm_call_get_all_text_hex_beg(analyzer);
	const all_text_hex_len = half_wasm_call_get_all_text_hex_len(analyzer);
	const all_text_hex_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, all_text_hex_beg, all_text_hex_len);
	const all_text_hex_str = new TextDecoder().decode(all_text_hex_obj);
	document.getElementById("o_hex").textContent = all_text_hex_str;
	const all_text_dec_beg = half_wasm_call_get_all_text_dec_beg(analyzer);
	const all_text_dec_len = half_wasm_call_get_all_text_dec_len(analyzer);
	const all_text_dec_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, all_text_dec_beg, all_text_dec_len);
	const all_text_dec_str = new TextDecoder().decode(all_text_dec_obj);
	document.getElementById("o_dec").textContent = all_text_dec_str;
	const all_text_sgn_beg = half_wasm_call_get_all_text_sgn_beg(analyzer);
	const all_text_sgn_len = half_wasm_call_get_all_text_sgn_len(analyzer);
	const all_text_sgn_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, all_text_sgn_beg, all_text_sgn_len);
	const all_text_sgn_str = new TextDecoder().decode(all_text_sgn_obj);
	document.getElementById("o_sgn").textContent = all_text_sgn_str;

	const sign_text_beg = half_wasm_call_get_sign_text_beg(analyzer);
	const sign_text_len = half_wasm_call_get_sign_text_len(analyzer);
	const sign_text_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, sign_text_beg, sign_text_len);
	const sign_text_str = new TextDecoder().decode(sign_text_obj);
	document.getElementById("o_sign").textContent = sign_text_str;

	const exponent_text_bin_beg = half_wasm_call_get_exponent_text_bin_beg(analyzer);
	const exponent_text_bin_len = half_wasm_call_get_exponent_text_bin_len(analyzer);
	const exponent_text_bin_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, exponent_text_bin_beg, exponent_text_bin_len);
	const exponent_text_bin_str = new TextDecoder().decode(exponent_text_bin_obj);
	document.getElementById("o_exp_bin").textContent = exponent_text_bin_str;
	const exponent_text_hex_beg = half_wasm_call_get_exponent_text_hex_beg(analyzer);
	const exponent_text_hex_len = half_wasm_call_get_exponent_text_hex_len(analyzer);
	const exponent_text_hex_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, exponent_text_hex_beg, exponent_text_hex_len);
	const exponent_text_hex_str = new TextDecoder().decode(exponent_text_hex_obj);
	document.getElementById("o_exp_hex").textContent = exponent_text_hex_str;
	const exponent_text_dec_beg = half_wasm_call_get_exponent_text_dec_beg(analyzer);
	const exponent_text_dec_len = half_wasm_call_get_exponent_text_dec_len(analyzer);
	const exponent_text_dec_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, exponent_text_dec_beg, exponent_text_dec_len);
	const exponent_text_dec_str = new TextDecoder().decode(exponent_text_dec_obj);
	document.getElementById("o_exp_dec").textContent = exponent_text_dec_str;
	const exponent_text_decoded_beg = half_wasm_call_get_exponent_text_decoded_beg(analyzer);
	const exponent_text_decoded_len = half_wasm_call_get_exponent_text_decoded_len(analyzer);
	const exponent_text_decoded_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, exponent_text_decoded_beg, exponent_text_decoded_len);
	const exponent_text_decoded_str = new TextDecoder().decode(exponent_text_decoded_obj);
	document.getElementById("o_exp_dcd").textContent = exponent_text_decoded_str;
	const exponent_text_type_beg = half_wasm_call_get_exponent_text_type_beg(analyzer);
	const exponent_text_type_len = half_wasm_call_get_exponent_text_type_len(analyzer);
	const exponent_text_type_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, exponent_text_type_beg, exponent_text_type_len);
	const exponent_text_type_str = new TextDecoder().decode(exponent_text_type_obj);
	document.getElementById("o_type").textContent = exponent_text_type_str;
	const exponent_text_implied_one_beg = half_wasm_call_get_exponent_text_implied_one_beg(analyzer);
	const exponent_text_implied_one_len = half_wasm_call_get_exponent_text_implied_one_len(analyzer);
	const exponent_text_implied_one_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, exponent_text_implied_one_beg, exponent_text_implied_one_len);
	const exponent_text_implied_one_str = new TextDecoder().decode(exponent_text_implied_one_obj);
	document.getElementById("o_one").textContent = exponent_text_implied_one_str;

	const mantissa_text_bin_beg = half_wasm_call_get_mantissa_text_bin_beg(analyzer);
	const mantissa_text_bin_len = half_wasm_call_get_mantissa_text_bin_len(analyzer);
	const mantissa_text_bin_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, mantissa_text_bin_beg, mantissa_text_bin_len);
	const mantissa_text_bin_str = new TextDecoder().decode(mantissa_text_bin_obj);
	document.getElementById("o_mts_bin").textContent = mantissa_text_bin_str;
	const mantissa_text_hex_beg = half_wasm_call_get_mantissa_text_hex_beg(analyzer);
	const mantissa_text_hex_len = half_wasm_call_get_mantissa_text_hex_len(analyzer);
	const mantissa_text_hex_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, mantissa_text_hex_beg, mantissa_text_hex_len);
	const mantissa_text_hex_str = new TextDecoder().decode(mantissa_text_hex_obj);
	document.getElementById("o_mts_hex").textContent = mantissa_text_hex_str;
	const mantissa_text_dec_beg = half_wasm_call_get_mantissa_text_dec_beg(analyzer);
	const mantissa_text_dec_len = half_wasm_call_get_mantissa_text_dec_len(analyzer);
	const mantissa_text_dec_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, mantissa_text_dec_beg, mantissa_text_dec_len);
	const mantissa_text_dec_str = new TextDecoder().decode(mantissa_text_dec_obj);
	document.getElementById("o_mts_dec").textContent = mantissa_text_dec_str;
	const mantissa_text_dcd_beg = half_wasm_call_get_mantissa_text_dcd_beg(analyzer);
	const mantissa_text_dcd_len = half_wasm_call_get_mantissa_text_dcd_len(analyzer);
	const mantissa_text_dcd_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, mantissa_text_dcd_beg, mantissa_text_dcd_len);
	const mantissa_text_dcd_str = new TextDecoder().decode(mantissa_text_dcd_obj);
	document.getElementById("o_mts_dcd").textContent = mantissa_text_dcd_str;

	const value_text_beg = half_wasm_call_get_value_text_beg(analyzer);
	const value_text_len = half_wasm_call_get_value_text_len(analyzer);
	const value_text_obj = new Uint8Array(analyzer.wi.exports.memory.buffer, value_text_beg, value_text_len);
	const value_text_str = new TextDecoder().decode(value_text_obj);
	document.getElementById("o_val").textContent = value_text_str;
}

function half_set_events(analyzer)
{
	"use strict";
	const n = 16;
	for(let i = 0; i != n; ++i)
	{
		const id = "bit" + i;
		const bit = document.getElementById(id);
		bit.addEventListener("change", function(){ half_on_changed(analyzer, bit, i); });
	}
}

function half_trigger_event(analyzer)
{
	"use strict";
	const bit = document.getElementById("bit0");
	half_on_changed(analyzer, bit, 0);
}

function half_parse_url(analyzer)
{
	"use strict";
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
			half_on_changed(analyzer, document.getElementById("bit" + i), i);
		}
	}
}

function half_on_wasm_loaded(analyzer, wm)
{
	"use strict";
	const wi = wm.instance;
	analyzer.wm = wm;
	analyzer.wi = wi;
	half_set_events(analyzer);
	half_trigger_event(analyzer);
	half_parse_url(analyzer);
}

function half_fetch_wasm(analyzer)
{
	"use strict";
	const fp = fetch("half.wasm");
	const wp = WebAssembly.instantiateStreaming(fp);
	wp.then(function(wm){ half_on_wasm_loaded(analyzer, wm); });
}

function half_make_checkboxes(analyzer)
{
	"use strict";

	const bits_all = 16;
	const bits_exp = 5;
	const bits_mts = 10;

	console.assert(bits_all == 1 + bits_exp + bits_mts);

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
	"use strict";
	const n = 16 / 8;
	let analyzer =
	{
		arr: new Array(n),
		wm: null,
		wi: null,
	};
	for(let i = 0; i != n; ++i)
	{
		analyzer.arr[i] = 0;
	}
	return analyzer;
}

function half_on_window_loaded()
{
	"use strict";
	const analyzer = half_init();
	half_make_checkboxes(analyzer);
	half_fetch_wasm(analyzer);
}

function half_start()
{
	"use strict";
	window.addEventListener("load", half_on_window_loaded);
}

half_start();
