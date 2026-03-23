"use strict";

function mk_on_window_loaded(event)
{
	"use strict";
	const fragment = new URL(window.location.href).hash;
	const link = document.getElementById("link");
	link.href += fragment;
	link.text += fragment;
	window.location.href = link.href;
}

function mk_start()
{
	"use strict";
	window.addEventListener("load", function(event){ "use strict"; mk_on_window_loaded(event); });
}

mk_start();
