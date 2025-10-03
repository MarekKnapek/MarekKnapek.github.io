"use strict";

function mk_crypt_make_encryptor(iv, key)
{
	"use strict";
	let counter = 0;
	const encryptor =
	{
		encrypt: function(plain_text)
		{
			"use strict";
			const mk_encrypter_make_failure = function(component, reason)
			{
				"use strict";
				const reject_obj =
				{
					m_component: component,
					m_orig_reason: reason,
					toString: function()
					{
						"use strict";
						return JSON.stringify
						(
							{
								component: `${this.m_component}`,
								orig_reason: `${this.m_orig_reason}`,
							}
						);
					},
				};
				return reject_obj;
			};
			const mk_encrypter_on_cipher_text_gud = function(encrypter, cipher_text_buf)
			{
				"use strict";
				const cipher_text_arr = new Uint8Array(cipher_text_buf);
				encrypter.m_resolve_cb(cipher_text_arr);
			};
			const mk_encrypter_on_cipher_text_bad = function(encrypter, reason)
			{
				"use strict";
				const reject_obj = mk_encrypter_make_failure("window.crypto.subtle.encrypt", reason);
				encrypter.m_reject_cb(reject_obj);
			};
			const mk_encrypter_increment_counter = function(encrypter)
			{
				"use strict";
				const ctr_buff = new ArrayBuffer(16);
				const ctr_incd = new Uint8Array(ctr_buff);
				ctr_incd.set(encrypter.m_iv_data);
				let rem = encrypter.m_counter;
				let idx = 0;
				let carry = 0;
				while(rem !== 0 || carry)
				{
					const ptr = (ctr_incd.length - 1) - idx;
					const byte = rem & 0xff;
					const neu = ctr_incd[ptr] + byte + carry;
					const cf = (neu > 0xff) ? 1 : 0;
					ctr_incd[ptr] = neu & 0xff;
					carry = cf;
					rem >>= 8;
					++idx;
				};
				return ctr_incd;
			};
			const mk_encrypter_make_alg = function(encrypter)
			{
				"use strict";
				const ctr_incd = mk_encrypter_increment_counter(encrypter);
				const alg =
				{
					name: "AES-CTR",
					counter: ctr_incd,
					length: 64,
				};
				return alg;
			};
			const mk_encrypter_on_key_gud = function(encrypter, key)
			{
				"use strict";
				const alg = mk_encrypter_make_alg(encrypter);
				const plain_text = encrypter.m_plain_text;
				const cipher_text_buf_promise = window.crypto.subtle.encrypt(alg, key, plain_text);
				cipher_text_buf_promise.then
				(
					function(cipher_text_buf){ "use strict"; mk_encrypter_on_cipher_text_gud(encrypter, cipher_text_buf); },
					function(reason         ){ "use strict"; mk_encrypter_on_cipher_text_bad(encrypter, reason         ); }
				);
			};
			const mk_encrypter_on_key_bad = function(encrypter, reason)
			{
				"use strict";
				const reject_obj = mk_encrypter_make_failure("window.crypto.subtle.importKey", reason);
				encrypter.m_reject_cb(reject_obj);
			};
			const mk_encrypter_make_key_promise = function(encrypter)
			{
				"use strict";
				const format = "raw";
				const key_data = encrypter.m_key_data;
				const alg = { name: "AES-CTR", };
				const extractable = false;
				const usages = [ "encrypt", ];
				const key_promise = window.crypto.subtle.importKey(format, key_data, alg, extractable, usages);
				return key_promise;
			};
			const mk_encrypter_executor = function(encrypter, resolve_cb, reject_cb)
			{
				"use strict";
				encrypter.m_resolve_cb = resolve_cb;
				encrypter.m_reject_cb = reject_cb;
				const key_promise = mk_encrypter_make_key_promise(encrypter);
				key_promise.then
				(
					function(key   ){ "use strict"; mk_encrypter_on_key_gud(encrypter, key   ); },
					function(reason){ "use strict"; mk_encrypter_on_key_bad(encrypter, reason); }
				);
			};
			const mk_encrypter_make = function(iv, key, counter, plain_text)
			{
				"use strict";
				const encrypter =
				{
					m_iv_data: iv,
					m_key_data: key,
					m_counter: counter,
					m_plain_text: plain_text,
					m_resolve_cb: null,
					m_reject_cb: null,
				};
				return encrypter;
			};
			console.assert(plain_text.length % 16 === 0);
			const encrypter = mk_encrypter_make(iv, key, counter, plain_text);
			counter += plain_text.length / 16;
			const cipher_text_arr_promise = new Promise(function(resolve_cb, reject_cb){ "use strict"; mk_encrypter_executor(encrypter, resolve_cb, reject_cb); });
			return cipher_text_arr_promise;
		},
	};
	return encryptor;
}










function mk_crypt_memcmp(arr_a, arr_b)
{
	"use strict";
	/* JavaScript has the Uint8Array type, but does not have any memcmp-like operation. What a joke language. */
	if(arr_a.length === arr_b.length)
	{
		const n = arr_a.length;
		for(let i = 0; i !== n; ++i)
		{
			if(arr_a[i] !== arr_b[i])
			{
				return false;
			}
		}
		return true;
	}
	return false;
}










function mk_crypt_get_iv()
{
	"use strict";
	const iv_hex = "f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff";
	const iv_arr = Uint8Array.fromHex(iv_hex);
	return iv_arr;
}

function mk_crypt_get_key()
{
	"use strict";
	const key_hex = "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4";
	const key_arr = Uint8Array.fromHex(key_hex);
	return key_arr;
}

function mk_crypt_get_plain_text()
{
	"use strict";
	const plain_text_hex = "6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710";
	const plain_text_arr = Uint8Array.fromHex(plain_text_hex);
	return plain_text_arr;
}

function mk_crypt_get_cipher_text()
{
	"use strict";
	const cipher_text_hex = "601ec313775789a5b7a7f504bbf3d228f443e3ca4d62b59aca84e990cacaf5c52b0930daa23de94ce87017ba2d84988ddfc9c58db67aada613c2dd08457941a6";
	const cipher_text_arr = Uint8Array.fromHex(cipher_text_hex);
	return cipher_text_arr;
}










function mk_crypt_test_1_on_encrypted_gud(encryptor, cipher_text)
{
	"use strict";
	if(mk_crypt_memcmp(cipher_text, mk_crypt_get_cipher_text()))
	{
		console.log("test_1_gud");
	}
	else
	{
		console.log("test_1_bad");
	}
}

function mk_crypt_test_1_on_encrypted_bad(encryptor, reason)
{
	"use strict";
	console.log(`Failed to encrypt data, reson: ${reason}`);
}

function mk_crypt_test_1_run()
{
	"use strict";
	const iv = mk_crypt_get_iv();
	const key = mk_crypt_get_key();
	const encryptor = mk_crypt_make_encryptor(iv, key);
	const plain_text = mk_crypt_get_plain_text();
	const cipher_text_promise = encryptor.encrypt(plain_text);
	cipher_text_promise.then
	(
		function(cipher_text){ "use strict"; mk_crypt_test_1_on_encrypted_gud(encryptor, cipher_text); },
		function(reason     ){ "use strict"; mk_crypt_test_1_on_encrypted_bad(encryptor, reason     ); }
	);
}










function mk_crypt_test_2_on_encrypted_test(mk_crypt_test_2_app)
{
	"use strict";
	const cipher_text_a = mk_crypt_get_cipher_text();
	const cipher_text_1 = new Uint8Array(cipher_text_a.buffer, 0 * 32, 32);
	const cipher_text_2 = new Uint8Array(cipher_text_a.buffer, 1 * 32, 32);
	if
	(
		mk_crypt_memcmp(mk_crypt_test_2_app.m_cipher_text_1, cipher_text_1) &&
		mk_crypt_memcmp(mk_crypt_test_2_app.m_cipher_text_2, cipher_text_2) &&
		true
	)
	{
		console.log("test_2_gud");
	}
	else
	{
		console.log("test_2_bad");
	}
}

function mk_crypt_test_2_on_encrypted_gud(mk_crypt_test_2_app, idx, cipher_text)
{
	"use strict";
	if(false){}
	else if(idx === 1){ mk_crypt_test_2_app.m_cipher_text_1 = cipher_text; }
	else if(idx === 2){ mk_crypt_test_2_app.m_cipher_text_2 = cipher_text; }
	else{ console.assert(false); }
	if
	(
		mk_crypt_test_2_app.m_cipher_text_1 !== null &&
		mk_crypt_test_2_app.m_cipher_text_2 !== null &&
		true
	)
	{
		mk_crypt_test_2_on_encrypted_test(mk_crypt_test_2_app);
	}
}

function mk_crypt_test_2_on_encrypted_bad(mk_crypt_test_2_app, idx, reason)
{
	"use strict";
	console.log(`Failed to encrypt data, reson: ${reason}`);
}

function mk_crypt_test_2_run()
{
	"use strict";
	const mk_crypt_test_2_app =
	{
		m_cipher_text_1: null,
		m_cipher_text_2: null,
	};
	const iv = mk_crypt_get_iv();
	const key = mk_crypt_get_key();
	const encryptor = mk_crypt_make_encryptor(iv, key);
	const plain_text_a = mk_crypt_get_plain_text();
	const plain_text_1 = new Uint8Array(plain_text_a.buffer, 0 * 32, 32);
	const cipher_text_1_promise = encryptor.encrypt(plain_text_1);
	cipher_text_1_promise.then
	(
		function(cipher_text){ "use strict"; mk_crypt_test_2_on_encrypted_gud(mk_crypt_test_2_app, 1, cipher_text); },
		function(reason     ){ "use strict"; mk_crypt_test_2_on_encrypted_bad(mk_crypt_test_2_app, 1, reason     ); }
	);
	const plain_text_2 = new Uint8Array(plain_text_a.buffer, 1 * 32, 32);
	const cipher_text_2_promise = encryptor.encrypt(plain_text_2);
	cipher_text_2_promise.then
	(
		function(cipher_text){ "use strict"; mk_crypt_test_2_on_encrypted_gud(mk_crypt_test_2_app, 2, cipher_text); },
		function(reason     ){ "use strict"; mk_crypt_test_2_on_encrypted_bad(mk_crypt_test_2_app, 2, reason     ); }
	);
}










function mk_crypt_start()
{
	"use strict";
	window.addEventListener("load", mk_crypt_test_1_run);
	window.addEventListener("load", mk_crypt_test_2_run);
}

mk_crypt_start();
