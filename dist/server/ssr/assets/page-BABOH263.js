import { C as __toESM, t as require_jsx_runtime, y as require_react } from "../index.js";
//#region app/page.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var choices = [
	"Minha mãe",
	"Meu amor",
	"Meu pai",
	"Uma amizade",
	"Outra pessoa especial"
];
function Home() {
	const [view, setView] = (0, import_react.useState)("home");
	const [step, setStep] = (0, import_react.useState)(0);
	const [form, setForm] = (0, import_react.useState)({
		recipient: "",
		style: "",
		honoree: "",
		story: "",
		buyerName: "",
		phone: ""
	});
	const [pix, setPix] = (0, import_react.useState)();
	const [error, setError] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const set = (key, value) => setForm((data) => ({
		...data,
		[key]: value
	}));
	const ready = step === 0 ? !!form.recipient : step === 1 ? !!form.style : step === 2 ? form.honoree.length > 1 : form.story.length > 15;
	async function generatePix() {
		setLoading(true);
		setError("");
		try {
			const r = await fetch("/api/orders", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					recipient: form.recipient,
					style: form.style,
					name: form.honoree,
					story: form.story,
					buyerName: form.buyerName,
					buyerPhone: form.phone.replace(/\D/g, "")
				})
			});
			const d = await r.json();
			if (!r.ok || !d.qrCode || !d.pixPayload) throw new Error(d.error || "Não foi possível gerar o Pix.");
			setPix({
				qrCode: d.qrCode,
				payload: d.pixPayload,
				expiresAt: d.expiresAt
			});
			setView("pix");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Tente novamente.");
		} finally {
			setLoading(false);
		}
	}
	if (view === "home") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-[#17142e] p-6 text-white",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mx-auto flex min-h-[90vh] max-w-4xl flex-col justify-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-bold uppercase tracking-[.2em] text-[#f1b55d]",
					children: "Canção Única"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-5 max-w-3xl font-[family-name:var(--font-playfair)] text-6xl leading-none md:text-8xl",
					children: "Sua história merece virar canção."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-7 max-w-xl text-lg text-white/70",
					children: "Crie uma letra personalizada, revise antes de pagar e receba as versões finais pelo WhatsApp."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setView("quiz"),
					className: "mt-9 w-fit rounded-2xl bg-[#f1b55d] px-7 py-5 font-bold text-[#17142e]",
					children: "Criar minha música"
				})
			]
		})
	});
	if (view === "quiz") {
		const fields = [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
				title: "Para quem é a canção?",
				options: choices,
				value: form.recipient,
				choose: (v) => set("recipient", v)
			}, "1"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
				title: "Qual estilo combina?",
				options: [
					"Romântico",
					"Sertanejo",
					"Gospel",
					"MPB",
					"Pop acústico"
				],
				value: form.style,
				choose: (v) => set("style", v)
			}, "2"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				title: "Nome da pessoa especial",
				value: form.honoree,
				change: (v) => set("honoree", v)
			}, "3"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				title: "Conte a história que vira letra",
				textarea: true,
				value: form.story,
				change: (v) => set("story", v)
			}, "4")
		];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
			className: "min-h-screen bg-[#17142e] p-6 text-white",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto flex min-h-[90vh] max-w-xl flex-col justify-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-bold uppercase tracking-[.2em] text-[#f1b55d]",
						children: [
							"Etapa ",
							step + 1,
							" de 4"
						]
					}),
					fields[step],
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: !ready,
						onClick: () => step === 3 ? setView("lyrics") : setStep(step + 1),
						className: "mt-8 rounded-2xl bg-[#f1b55d] px-6 py-5 font-bold text-[#17142e] disabled:opacity-40",
						children: "Continuar"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => step ? setStep(step - 1) : setView("home"),
						className: "mt-4 text-sm text-white/65",
						children: "Voltar"
					})
				]
			})
		});
	}
	if (view === "lyrics") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-[#17142e] p-6 text-white",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mx-auto flex min-h-[90vh] max-w-xl flex-col justify-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-bold uppercase tracking-[.2em] text-[#f1b55d]",
					children: "Revise sua letra"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-4 font-[family-name:var(--font-playfair)] text-5xl",
					children: ["Para ", form.honoree]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
					className: "mt-8 rounded-3xl border border-white/15 bg-white/10 p-6 whitespace-pre-line leading-8",
					children: `Para ${form.honoree}, eu transformei em canção\n${form.story}\n\nCom ${form.recipient.toLowerCase()} no coração,\numa história única em forma de emoção.`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setView("contact"),
					className: "mt-7 w-full rounded-2xl bg-[#f1b55d] px-6 py-5 font-bold text-[#17142e]",
					children: "Gostei, gerar meu Pix"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setView("quiz"),
					className: "mt-4 w-full text-sm text-white/65",
					children: "Quero alterar algo"
				})
			]
		})
	});
	if (view === "contact") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-[#fffaf5] p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mx-auto max-w-xl py-14",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-bold uppercase tracking-[.2em] text-[#6740a3]",
					children: "Último passo"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-4 font-[family-name:var(--font-playfair)] text-5xl",
					children: "Onde falamos com você?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-8 block font-bold",
					children: "Seu nome"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: form.buyerName,
					onChange: (e) => set("buyerName", e.target.value),
					className: "mt-2 w-full rounded-xl border border-black/10 p-4",
					placeholder: "Seu nome"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-5 block font-bold",
					children: "WhatsApp"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex rounded-xl border border-black/10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "bg-black/5 p-4 font-bold",
						children: "+55"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: form.phone,
						onChange: (e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11)),
						className: "min-w-0 flex-1 p-4",
						inputMode: "numeric",
						placeholder: "(11) 99999-9999"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					disabled: loading || form.buyerName.length < 2 || form.phone.length < 10,
					onClick: generatePix,
					className: "mt-7 w-full rounded-2xl bg-[#3f2052] px-6 py-5 font-bold text-white disabled:opacity-40",
					children: loading ? "Gerando…" : "Gerar Pix de R$ 39,90"
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-red-700",
					children: error
				})
			]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-[#fffaf5] p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mx-auto max-w-xl py-10 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-bold uppercase tracking-[.2em] text-[#6740a3]",
					children: "Pix seguro"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-4 font-[family-name:var(--font-playfair)] text-5xl",
					children: "Escaneie e confirme."
				}),
				pix && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 rounded-3xl bg-white p-6 shadow-xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: pix.qrCode,
							alt: "QR Code Pix",
							className: "mx-auto h-64 w-64"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => navigator.clipboard.writeText(pix.payload),
							className: "mt-6 w-full rounded-2xl bg-[#3f2052] p-4 font-bold text-white",
							children: "Copiar código Pix"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-sm text-[#625b6d]",
							children: "Após a confirmação, sua música entra em preparação e você recebe contato pelo WhatsApp."
						})
					]
				})
			]
		})
	});
}
function Pick({ title, options, value, choose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "mt-5 font-[family-name:var(--font-playfair)] text-5xl",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-8 grid gap-3",
		children: options.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: () => choose(x),
			className: `rounded-2xl border p-5 text-left ${value === x ? "border-[#f1b55d] bg-[#f1b55d]/15" : "border-white/15"}`,
			children: x
		}, x))
	})] });
}
function Input({ title, value, change, textarea }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "mt-5 font-[family-name:var(--font-playfair)] text-5xl",
		children: title
	}), textarea ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		value,
		onChange: (e) => change(e.target.value),
		className: "mt-8 min-h-48 w-full rounded-2xl border border-white/15 bg-white/10 p-5"
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		value,
		onChange: (e) => change(e.target.value),
		className: "mt-8 w-full rounded-2xl border border-white/15 bg-white/10 p-5"
	})] });
}
//#endregion
export { Home as default };
