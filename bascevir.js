const linkCreator = {
	datamuse: (word) => `https://api.datamuse.com/words?max=1&md=d&sp=${word}`,
}

const getWord = (q) => {
	return fetch(`https://api.datamuse.com/words?max=1&md=d&sp=${q}`)
		.then(res => res.json())
		.then(resJson => resJson[0].defs[0].split("\t")[1])
}

const createPopup = (id, word, text, x, y, clientWidth) => {
	let offsetX = 350 - x;
	let r = x > (clientWidth / 2) ? 1 : -1;
	if (r === 1) {
		offsetX = clientWidth - offsetX;
	}

	const popup = document.createElement("div");
	popup.setAttribute("id", id);
	popup.setAttribute("style", `
    top:${y}px;
    left:${y}px;
    width:0px;
    height:0px;
    position:absolute;
    z-index:5;
    user-select:none;`);

	const box = document.createElement("div");
	box.setAttribute("class", "box");
	box.setAttribute("style", `
    display:inline;
    max-width:300px;
    width:max-content;
    position:absolute;
    margin-top:-5px;
    z-index:0;`);

	const link = document.createElement("a");
	link.href = `https://dictionary.cambridge.org/dictionary/english/${word}`;
	link.target = "_blank";
	link.style.outline = "0";

	const content = document.createElement("span");
	content.innerText = text;
	content.setAttribute("class", "onetap-content");
	content.setAttribute("style", `
    border-radius: 5px 0px 0px 5px;
    padding: 10px 20px;
    background-color: #333;
    font-size: 18px;
    font-family: Open Sans; 
    color: #fff;
    display: inline-block;`);

	link.appendChild(content);

	box.appendChild(link)

	popup.appendChild(box);
	document.body.appendChild(popup);

	box.style.left = (offsetX - (Number(r === -1) * box.clientWidth)) + "px";

	var draw = SVG().addTo(`#${id}`).size(offsetX, 16)
	draw.node.style.overflow = "visible";
	var line = draw.polyline([0, 0, 10 * r, 10, offsetX, 10]);
	line.stroke({ color: '#ccc', width: 3 }).fill("none");
}

const injectHighlight = (selection, id) => {
	let { anchorOffset: start, focusOffset: end } = selection;
	if (start > end) {
		[start, end] = [end, start]
	}

	let parentElement = selection.anchorNode.parentElement;

	const highlight = Array.from(selection.anchorNode.textContent).map((_, key) => {
		if (key === start) {
			return `<span class="${id} onetap-highlight" style="background-color: #b65656; color: #fff">${_}`
		}
		if (key === end) {
			return `${_.trim("")}</span> `
		}
		return _;
	}).filter(Boolean).join("");

	parentElement.innerHTML = parentElement.innerHTML.replace(selection.anchorNode.textContent, highlight);

	let { top, left, width, height } = document.querySelector(`span.${id}`).getBoundingClientRect();
	if ((left + window.pageXOffset + width) < document.body.clientWidth / 2) {
		width = 0;
	}

	const willRemoveHighlights = Array.from(document.querySelectorAll("span.onetap-highlight"))
		.filter(el => el.getBoundingClientRect().top === top)
		.filter(el => el.classList[0] !== id);

	removeHighlight(willRemoveHighlights);

	return { x: left + window.pageXOffset + width, y: top + window.pageYOffset + height - 5, }
}

const removeHighlight = (nodes) => {
	for (let el of nodes) {
		let parentElement = el.parentElement
		el.outerHTML = el.innerText;
		parentElement = parentElement.innerHTML.replace(/\n/gm, "")
		let div = document.querySelector(`div#${el.classList[0]}`);
		if (div) { div.remove() }
	}
}

const goDictionary = (id, word) => {
	browser.storage.sync.get('activeDictId').then(value => {
		const activeDict = value.activeDictId;
		if (activeDict && activeDict in linkCreator) {
			const link = linkCreator[activeDict](word)
			window.open(link, '_blank').focus();
			return;
		}
	})
}


document.addEventListener("click", event => {
	if (!event.ctrlKey) {
		browser.storage.sync.get('permanentBoxesValue')
			.then(({ permanentBoxesValue }) => {
				const exclude_classnames = ["onetap-content", "highlight-info-button"];
				if (!permanentBoxesValue && !Array.from(event.target.classList).some(_class => exclude_classnames.includes(_class))) {
					removeHighlight(document.querySelectorAll('span.onetap-highlight'))
				}
			})
		return
	}

	const selection = window.getSelection();
	const word = selection.toString();
	if (!word) { return };

	const id = "h" + Math.random().toString(36).substring(7);
	const { x, y } = injectHighlight(selection, id)
	getWord(word).then((meaning) => {
		createPopup(id, word, meaning, x, y, document.body.clientWidth)
	}).catch(console.log)
});
