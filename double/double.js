"use strict";

let double_g;

function double_on_changed(bit, idx)
{
	const bin_offset = 8;
	const bin_len = 64;
	const hex_offset = bin_offset + bin_len;
	const hex_len = 16;
	const uns_offset = hex_offset + hex_len + 1;
	const uns_len = 20;
	const sig_offset = uns_offset + uns_len + 1;
	const sig_len = 21;
	const sgn_offset = sig_offset + sig_len;
	const sgn_len = 1;
	const exp_bin_off = sgn_offset + sgn_len;
	const exp_bin_len = 16;
	const exp_hex_off = exp_bin_off + exp_bin_len;
	const exp_hex_len = 4;
	const exp_dec_off = exp_hex_off + exp_hex_len + 1;
	const exp_dec_len = 5;
	const exp_dcd_off = exp_dec_off + exp_dec_len + 1;
	const exp_dcd_len = 6;
	const type_off = exp_dcd_off + exp_dcd_len;
	const type_len = 1;
	const one_off = type_off + type_len;
	const one_len = 1;
	const mts_bin_off = one_off + one_len;
	const mts_bin_len = 64;
	const mts_hex_off = mts_bin_off + mts_bin_len;
	const mts_hex_len = 16;
	const mts_dec_off = mts_hex_off + mts_hex_len + 1;
	const mts_dec_len = 20;
	const mts_dcd_off = mts_dec_off + mts_dec_len + 1;
	const mts_dcd_len = 1 + 1 + 52;
	const val_offset = mts_dcd_off + mts_dcd_len + 2;
	const val_len = 1077;

	const byte_idx = Math.floor(idx / 8);
	const bit_idx = idx % 8;
	if(bit.checked)
	{
		double_g.arr[byte_idx] = double_g.arr[byte_idx] | (1 << bit_idx);
	}
	else
	{
		double_g.arr[byte_idx] = double_g.arr[byte_idx] &~ (1 << bit_idx);
	}
	const analyzer = double_g.wi.exports.double_analyzer_analyze(double_g.arr[0], double_g.arr[1], double_g.arr[2], double_g.arr[3], double_g.arr[4], double_g.arr[5], double_g.arr[6], double_g.arr[7]);
	const bin_buf = double_g.wi.exports.memory.buffer.slice(analyzer + bin_offset, analyzer + bin_offset + bin_len); const binstr = new TextDecoder().decode(bin_buf);
	const hex_buf = double_g.wi.exports.memory.buffer.slice(analyzer + hex_offset, analyzer + hex_offset + hex_len); const hexstr = new TextDecoder().decode(hex_buf);
	const le1_buf = double_g.wi.exports.memory.buffer.slice(analyzer + uns_offset - 1, analyzer + uns_offset - 0);
	const uns_buf = double_g.wi.exports.memory.buffer.slice(analyzer + uns_offset, analyzer + uns_offset + new Uint8Array(le1_buf)[0]); const unsstr = new TextDecoder().decode(uns_buf);
	const le2_buf = double_g.wi.exports.memory.buffer.slice(analyzer + sig_offset - 1, analyzer + sig_offset - 0);
	const sig_buf = double_g.wi.exports.memory.buffer.slice(analyzer + sig_offset, analyzer + sig_offset + new Uint8Array(le2_buf)[0]); const sigstr = new TextDecoder().decode(sig_buf);
	const sgn_buf = double_g.wi.exports.memory.buffer.slice(analyzer + sgn_offset, analyzer + sgn_offset + 1); const sgn_val = new Uint8Array(sgn_buf); console.assert(sgn_val == 0 || sgn_val == 1); const sgn_str = sgn_val == 0 ? "Positive" : "Negative";
	const exp_bin_buff = double_g.wi.exports.memory.buffer.slice(analyzer + exp_bin_off + (16 - 11), analyzer + exp_bin_off + (16 - 11) + 11); const exp_bin_str = new TextDecoder().decode(exp_bin_buff);
	const exp_hex_buff = double_g.wi.exports.memory.buffer.slice(analyzer + exp_hex_off + (4 - Math.ceil(11 / 4)), analyzer + exp_hex_off + (4 - Math.ceil(11 / 4)) + Math.ceil(11 / 4)); const exp_hex_str = new TextDecoder().decode(exp_hex_buff);
	const le3_buf = double_g.wi.exports.memory.buffer.slice(analyzer + exp_dec_off - 1, analyzer + exp_dec_off - 0);
	const exp_dec_buff = double_g.wi.exports.memory.buffer.slice(analyzer + exp_dec_off, analyzer + exp_dec_off + new Uint8Array(le3_buf)[0]); const exp_dec_str = new TextDecoder().decode(exp_dec_buff);
	const le4_buf = double_g.wi.exports.memory.buffer.slice(analyzer + exp_dcd_off - 1, analyzer + exp_dcd_off - 0);
	const exp_dcd_buff = double_g.wi.exports.memory.buffer.slice(analyzer + exp_dcd_off, analyzer + exp_dcd_off + new Uint8Array(le4_buf)[0]); const exp_dcd_str = new TextDecoder().decode(exp_dcd_buff);
	const type_buf = double_g.wi.exports.memory.buffer.slice(analyzer + type_off, analyzer + type_off + 1); const type_val = new Uint8Array(type_buf); console.assert(type_val >= 0 || type_val <= 4); const type_str = type_val == 0 ? "Zero" : (type_val == 1 ? "Denormal" : (type_val == 2 ? "Infinity" : (type_val == 3 ? "NaN" : "Normal")));
	const one_buf = double_g.wi.exports.memory.buffer.slice(analyzer + one_off, analyzer + one_off + 1); const one_val = new Uint8Array(one_buf); console.assert(one_val == 0 || one_val == 1); const one_str = one_val == 0 ? "No" : "Yes";
	const mts_bin_buf = double_g.wi.exports.memory.buffer.slice(analyzer + mts_bin_off + (64 - 52), analyzer + mts_bin_off + (64 - 52) + 52); const mts_bin_str = new TextDecoder().decode(mts_bin_buf);
	const mts_hex_buf = double_g.wi.exports.memory.buffer.slice(analyzer + mts_hex_off + (8 * 2 - Math.ceil(52 / 4)), analyzer + mts_hex_off + (8 * 2 - Math.ceil(52 / 4)) + Math.ceil(52 / 4)); const mts_hex_str = new TextDecoder().decode(mts_hex_buf);
	const le5_buf = double_g.wi.exports.memory.buffer.slice(analyzer + mts_dec_off - 1, analyzer + mts_dec_off - 0);
	const mts_dec_buff = double_g.wi.exports.memory.buffer.slice(analyzer + mts_dec_off, analyzer + mts_dec_off + new Uint8Array(le5_buf)[0]); const mts_dec_str = new TextDecoder().decode(mts_dec_buff);
	const le6_buf = double_g.wi.exports.memory.buffer.slice(analyzer + mts_dcd_off - 1, analyzer + mts_dcd_off - 0);
	const mts_dcd_buf = double_g.wi.exports.memory.buffer.slice(analyzer + mts_dcd_off, analyzer + mts_dcd_off + new Uint8Array(le6_buf)[0]); const mts_dcd_str = new TextDecoder().decode(mts_dcd_buf);
	const le7_buf = double_g.wi.exports.memory.buffer.slice(analyzer + val_offset - 2, analyzer + val_offset - 1);
	const le8_buf = double_g.wi.exports.memory.buffer.slice(analyzer + val_offset - 1, analyzer + val_offset - 0);
	const val_buf = double_g.wi.exports.memory.buffer.slice(analyzer + val_offset, analyzer + val_offset + (((new Uint8Array(le7_buf)[0]) << 0) | ((new Uint8Array(le8_buf)[0]) << 8))); const valstr = new TextDecoder().decode(val_buf);
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

function double_set_events()
{
	const n = 64;
	for(let i = 0; i != n; ++i)
	{
		const id = "bit" + i;
		const bit = document.getElementById(id);
		bit.addEventListener("change", function(){ double_on_changed(bit, i); });
	}
}

function double_trigger_event()
{
	const bit = document.getElementById("bit0");
	double_on_changed(bit, 0);

}

function double_on_wasm_loaded(wm)
{
	const wi = wm.instance;
	double_g.wm = wm;
	double_g.wi = wi;
	double_set_events();
	double_trigger_event();
}

function double_fetch_wasm()
{
	const fp = fetch("double.wasm");
	const wp = WebAssembly.instantiateStreaming(fp);
	wp.then(function(wm){ double_on_wasm_loaded(wm); });
}

function double_init()
{
	const n = 8;
	double_g =
	{
		arr: new Array(n),
		wm: null,
		wi: null,
	};
	for(let i = 0; i != n; ++i)
	{
		double_g.arr[i] = 0;
	}
}

function double_on_window_loaded()
{
	double_init();
	double_fetch_wasm();
}

function double_start()
{
	window.addEventListener("load", double_on_window_loaded);
}

double_start();
