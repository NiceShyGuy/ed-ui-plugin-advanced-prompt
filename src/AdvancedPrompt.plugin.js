/**
 * Advanced Prompt Plugin
 * Version 0.3.1
 * Author: @3V1LXD
 * License: MIT
 * Description:  
 * Optional collapsible advanced prompt table below the prompt field.
 * Reordered with drag handles.
 * R-click handle/clear field to delete prompt from table.
 * , + enter/tab to add prompt to table.
 * Alt + ; to add weight to selected phrase
 * Alt + 9 to add emphasis to selected phrase
 * Alt + [ to add de-emphasis to selected phrase
 * Alt + Shift + { to add option to selected phrase
 * Alt + ` to add blend to selected phrase
 * Alt + Scroll to change weights, emphasis, and de-emphasis
 */

function waitFor(selectors) {
    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (selectors.every(selector => document.querySelector(selector) !== null)) {
                observer.disconnect();
                resolve();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    });
}


(async function () {
    "use strict";
    let styleSheet = document.createElement("style");

    styleSheet.textContent = `
        #ap-wrapper {  background: var(--background-color4); border: 1px solid var(--background-color3); border-radius: 7px; padding: 7px; margin-bottom: 15px; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.15), 0 6px 20px 0 rgba(0, 0, 0, 0.15);  }
        .ap-summary { cursor: pointer; display: grid; grid-template-columns: auto auto auto 1fr auto auto; align-items: center; width: 100%; white-space: nowrap; gap: 3px; }
        .ap-table { width: 100%; display: none; }
        .ap-row { display: grid; grid-template-columns: 32px auto; grid-gap: 10px; margin-top: 6px; }
        i { font-style: normal; }
        .ap-table th, .ap-table td { padding: 0;}
        /* center first td */
        .ap-table td:first-child { display: flex; justify-content: center; align-items: center; }
        .chat { padding-right: 10px; }
        .handle { cursor: grab; }
        .ap { -moz-user-select: text; -webkit-user-select: text; -ms-user-select: text; user-select: text; }
        .settings { border-radius: none; background: none; border: none; }
        .dialog { background-color: var(--background-color1); border: 1px solid var(--background-color2); border-radius: var(--input-border-radius); color: var(--text-normal); display: grid; padding: 20px; min-width: 40%; min-height: 90%; }
        .dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
        .dialog-content { display: grid; grid-template-columns: 1fr; grid-template-rows: min-content; }
        .dialog-header { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: min-content; grid-gap: 10px; height: min-content; }
        .dialog-title { font-size: 20px; font-weight: bold; width: auto; height: auto; }
        .close { color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; text-align: right; height: auto; }
        .dialog-body { grid-row: 2 / span 1; height: 100%; }
        .dialog-body input, .settings-form textarea, .ap { accent-color: var(--accent-color); background: var(--input-background-color); border: 2px solid var(--background-color2); border-radius: var(--input-border-radius); width: 100%; padding: 4px; }
        .dialog-body input:focus, .settings-form textarea:focus, .ap:focus { border: 2px solid var(--accent-color); outline: none; }
        .settings-form textarea::-webkit-resizer { background-color: var(--background-color2); border: 2px solid var(--background-color2); }
        .settings-form { display: grid; grid-template-columns: 128px 1fr; grid-template-rows: repeat(9, min-content) 1fr min-content; grid-gap: 10px; height: 100%; }
        .settings-form button { grid-column: 1 / span 2; margin-top: 10px; padding: 10px 0; }
        .dialog-footer { display: none; }
        .drag-handle { display: inline-block; cursor: grab; min-width: 50px !important; min-height: 1rem; }
        .weighted-words { display: inline-block; color: hsl(79,60%,50%);}
        .emphasis-words { display: inline-block; color: hsl(200,60%,50%);}
        .de-emphasis-words { display: inline-block; color: hsl(0,60%,50%);}
        .blended-words { display: inline-block; color: hsl(24,60%,50%);}
        .option-words { display: inline-block; color: hsl(50,60%,50%);}
        .bang { display: inline-block; color: hsl(50,60%,50%);}
        #settings { transition: none; }
        .spin { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(359deg); } }
    `;

    const defaults = {
        model: "gpt-3.5-turbo",
        role: "user",
        temperature: 0,
        top_p: 1,
        max_tokens: 75,
        presence_penalty: 0,
        frequency_penalty: 0,
        instructions: `1. Take the original prompt and imagine the desired image with as much detail as possible.\n2. Generate a new prompt that is more specific and descriptive to guide Stable Diffusion.\n3. Use clear, detailed phrases separating ideas by categories with a comma to describe the desired image. \n4. Categories should include but not limited to subject, acting, style, and camera.\n5. Mention important characteristics, such as colors, shapes, sizes, and positions.\n6. Keep the new prompt concise and avoid using overly complex language or concepts. Avoid ambiguity and generic terms.\n7. Image Modifiers are required such as art styles, tags, and artist names (if they match the style) to the end of the prompt. (e.g. "Painting, Detailed and Intricate, Impressionism, by Bob Eggleton")\n8. Do not include any other punctuation other than commas.\n9. Do not include any other form of information other than the new prompt.\n10. Do not use a code block or quotation marks.\n11. Restrict response to no more than 75 tokens but try to reach the maximum limit without losing context.\nNew Prompt Example:\nan astronaut in a golden space suit, riding on the back of a majestic black horse, galloping on the moon towards the camera with its mane and tail flowing in the wind, with the Earth setting in the background, Photograph, Landscape, by NASA`,
    };

    document.head.appendChild(styleSheet);
    await buildAP();
    updateAP(promptField.value);
    let activePrompt = null;

    document.getElementById("prompt").addEventListener("input", e => {
        let p = splitPrompt(e.target.value);
        if (activePrompt && p[0] !== " New Prompt" && p[p.length - 1] !== " New Prompt") return;
        activePrompt = e.target;
        updateAP(e.target.value);
        activePrompt = null;
    });

    function addWeight(e) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) { 
            const range = selection.getRangeAt(0);
            const start = range.startOffset;
            const end = range.endOffset;
            const text = range.startContainer.textContent;
            if (start !== end && text.substring(start, end).indexOf(":") === -1) {
                const weight = "1.0";
                let selectedText = text.substring(start, end);
                var newText = '';
                if (e.altKey) {
                    newText = text.substring(0, start) + selectedText + ":" + weight + text.substring(end);
                    range.startContainer.textContent = newText;
                    updatePromptField();
                }
            }
        }
    }

    async function apKeyDownListener(e) {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            e.target.blur();
            updateAP(promptField.value);
        }
        if (e.altKey && e.key === ";") {
            e.preventDefault();
            addWeight(e);
        }
        
        const selection = window.getSelection().toString();
        
        if (e.altKey && e.key === "9") {
            e.preventDefault();
            var newText = "(" + selection + ")";
            promptField.value = promptField.value.replace(selection, newText);
            updateAP(promptField.value);
        }
        
        if (e.altKey && e.key === "[") {
            e.preventDefault();
            var newText = "[" + selection + "]";
            promptField.value = promptField.value.replace(selection, newText);
            updateAP(promptField.value);
        }
        
        if (e.altKey && e.key === "{") {
            e.preventDefault();
            var newText = "{" + selection + "}";
            promptField.value = promptField.value.replace(selection, newText);
            updateAP(promptField.value);
        }
        
        if (e.altKey && e.shiftKey && e.key === "'") {
            e.preventDefault();
            var newText = "" + selection + "";
            promptField.value = promptField.value.replace(selection, newText);
            updateAP(promptField.value);
        }
        
        if (e.altKey && e.key === "`") {
            e.preventDefault();
            var newText = "`" + selection + "`";
            promptField.value = promptField.value.replace(selection, newText);
            updateAP(promptField.value);
        }
    }

    function styleAP(prompt) {
        var phrases = splitPrompt(prompt);
        const blend = phrases.map((phrase) => {
            let newPhrase = '';
            let inQuotes = false;
            let quoteChar = null;
            let quoteStart = 0;
            for (let i = 0; i < phrase.length; i++) {
                if (phrase[i] === '"') {
                    if (!inQuotes) {
                        inQuotes = true;
                        quoteChar = '"';
                        quoteStart = i;
                    } else if (quoteChar === '"') {
                        inQuotes = false;
                        quoteChar = null;
                        newPhrase += '<span class="blended-words">' + phrase.substring(quoteStart, i+1) + '</span>';
                    }
                } else if (phrase[i] === '`') {
                    if (!inQuotes) {
                        inQuotes = true;
                        quoteChar = '`';
                        quoteStart = i;
                    } else if (quoteChar === '`') {
                        inQuotes = false;
                        quoteChar = null;
                        newPhrase += '<span class="blended-words">' + phrase.substring(quoteStart, i+1) + '</span>';
                    }
                } else if (!inQuotes) {
                    newPhrase += phrase[i];
                }
            }
            return newPhrase;
        });

        const result = blend.map((phrase) => {
            let newPhrase = '';
            const optionPattern = /\{.*\}/g;
            phrase = phrase.replace(optionPattern, '<span class="option-words">$&</span>');
            const numberPattern = /\b\d+(\.\d+)?\b/g;
            phrase = phrase.replace(numberPattern, '<span class="weighted-words">$&</span>');
            let level = 0;
            for (let i = 0; i < phrase.length; i++) {
                if (phrase[i] === '(') {
                    if (level === 0) {
                        newPhrase += '<span class="emphasis-words">';
                    }
                    level++;
                }
    
                newPhrase += phrase[i];
    
                if (phrase[i] === ')') {
                    level--;
                    if (level === 0) {
                        newPhrase += '</span>';
                    }
                }
            }
            phrase = newPhrase;

            level = 0;
            newPhrase = '';
            for (let j = 0; j < phrase.length; j++) {
                if (phrase[j] === '[') {
                    if (level === 0) {
                        newPhrase += '<span class="de-emphasis-words">';
                    }
                    level++;
                }

                newPhrase += phrase[j];

                if (phrase[j] === ']') {
                    level--;
                    if (level === 0) {
                        newPhrase += '</span>';
                    }
                }
            }
            return newPhrase;
        });
        if (result[0][0] === '!') {
            result[0] = '<span class="bang">' + result[0][0] + '</span>' + result[0].substring(1);
        }
        return result.join("");
    }
    
    function splitPrompt(prompt) {
        let stack = [];
        let buffer = '';
        let result = [];
        let inQuotes = false;
      
        for (let ch of prompt) {
            if (ch === '"' || ch === '`') {
                inQuotes = !inQuotes;
            }
        
            if (inQuotes) {
                buffer += ch;
                continue;
            }
        
            if (ch === '(' || ch === '[' || ch === '{') {
                stack.push(ch);
                buffer += ch;
            } else if (ch === ')' || ch === ']' || ch === '}') {
                buffer += ch;
                let lastOpen = stack.pop();
                let matched = (lastOpen === '(' && ch === ')') || (lastOpen === '[' && ch === ']') || (lastOpen === '{' && ch === '}');
        
                if (stack.length === 0 && matched) {
                result.push(buffer.trim());
                buffer = '';
                }
            } else if (ch === ',' && stack.length === 0) {
                if (buffer.trim() !== '') {
                result.push(buffer.trim());
                }
                buffer = '';
            } else {
                buffer += ch;
            }
        }
      
        if (buffer.trim() !== '') {
          result.push(buffer.trim());
        }
      
        return result;
    }

    function joinAP() {
        let aps = document.querySelectorAll(".ap");
        let prompts = [];
        for (let i = 0; i < aps.length; i++) {
            let ap = aps[i].innerHTML;
            let first = ap.substring(0, 1);
            let last = ap.substring(ap.length - 1, ap.length);
            if (first == ",") {
                ap = ap.substring(1, ap.length);
                prompts.push(" New Prompt, " + ap);
            } else if (last == ",") {
                ap = ap.substring(0, ap.length - 1);
                prompts.push(ap + ", New Prompt");
            } else if (ap != "") {
                prompts.push(ap);
            }
        }
        return prompts.join(",");
    }

    function resetDragDrop(prompts) {
        let table = document.querySelector(".ap-table");
        let rows = table.querySelectorAll("tr");
        
        for (let i = 0; i < prompts.length; i++) {
            let row = rows[i + 1];
            row.ondragstart = drag(i);
            row.ondragover = (e) => e.preventDefault();
            row.ondrop = drop;
            let prompt = prompts[i];
            let handle = rows[i + 1].querySelector(".handle");
            handle.innerHTML = "☰";
            handle.id = "handle" + i;
            let ap = rows[i + 1].querySelector(".ap");
            ap.id = "ap" + i;
            prompt = prompt.replace("New Prompt", "");
            ap.innerHTML = styleAP(prompt);
            let weighted_words = ap.querySelectorAll(".weighted-words");
            for (let j = 0; j < weighted_words.length; j++) {
                weighted_words[j].addEventListener("wheel", (e) => {
                    if (e.altKey) {
                        let weight = weighted_words[j].innerHTML;
                        let increment = 0.01;
                        weight = Math.round((parseFloat(weight) + (e.deltaY > 0 ? -increment : increment)) * 100) / 100;
                        weighted_words[j].innerHTML = weight;
                        updatePromptField();
                    }
                });
            }
            let emphasis_words = document.querySelectorAll(".emphasis-words");
            for (let j = 0; j < emphasis_words.length; j++) {
                emphasis_words[j].addEventListener("wheel", (e) => {
                    if (e.altKey) {
                        let emphasis = emphasis_words[j].textContent;
                        if (e.deltaY < 0) {
                            emphasis = "(" + emphasis + ")";
                        } else {
                            const second = emphasis.substring(1, 2);
                            if (emphasis.startsWith("(") && emphasis.endsWith(")") && second === "(") {
                                emphasis = emphasis.substring(1, emphasis.length - 1);
                            }
                        }
                        emphasis_words[j].textContent = emphasis;
                        updatePromptField();
                    }
                });
            }
            let deEmphasis_words = document.querySelectorAll(".de-emphasis-words");
            for (let j = 0; j < deEmphasis_words.length; j++) {
                deEmphasis_words[j].addEventListener("wheel", (e) => {
                    if (e.altKey) {
                        let emphasis = deEmphasis_words[j].textContent;
                        if (e.deltaY < 0) {
                            emphasis = "[" + emphasis + "]";
                        } else {
                            const second = emphasis.substring(1, 2);
                            if (emphasis.startsWith("[") && emphasis.endsWith("]") && second === "[") {
                                emphasis = emphasis.substring(1, emphasis.length - 1);
                            }
                        }
                        deEmphasis_words[j].textContent = emphasis;
                        updatePromptField();
                    }
                });
            }
        }
    }

    function drag(i) {
        return function (e) {
            e.dataTransfer.setData("index", i);
        };
    }

    function drop(e) {
        const source = e.dataTransfer.getData("index");
        const target = e.target.id.split("handle")[1];
        if (target === undefined) return;
        
        let prompts = splitPrompt(promptField.value);
        let source_prompt = prompts[source];

        prompts.splice(source, 1);
        prompts.splice(target, 0, source_prompt);

        promptField.value = prompts.join(",");
        promptField.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function updateTokenCount() {
        let tokenCount = document.querySelector(".token-count");
        let prompt = promptField.value;
        let count = countTokens(prompt);
        tokenCount.innerHTML = count;
    }

    function countTokens(text) {
        const textWithoutWhitespaces = text.replace(/\s+/g, '');
        const numOfDigits = (text.match(/\d/g) || []).length;
        const numOfNonNumericCharacters = textWithoutWhitespaces.length - numOfDigits;
        const tokenCount = numOfDigits + Math.ceil(numOfNonNumericCharacters / 4);
        return tokenCount;
    }

    function seed() {
        return Math.floor(Math.random() * 1000000000);
    }

    async function callOpenAI(prompt) {
        const get = key => localStorage.getItem(key);
        const data = {
            model: get("model") || "gpt-3.5-turbo",
            messages: [{ role: get("role") || "user", content: `${prompt}\n\n Seed: ${seed()}`, name: get("name") || "" }],
            temperature: parseInt(get("temperature")) || 0,
            top_p: parseInt(get("top_p")) || 1,
            max_tokens: parseInt(get("max_tokens")) || 75,
            presence_penalty: parseInt(get("presence_penalty")) || 0,
            frequency_penalty: parseInt(get("frequency_penalty")) || 0,
        };

        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${get("key")}` },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            return res.ok ? json.choices[0].message.content : json.error.message;
        } catch (error) {
            console.log(error);
            return error;
        }
    }

    function apInputListener(e) {
        activePrompt = e.target;
        updatePromptField();
        activePrompt = null;
    }

    function updatePromptField() {
        const prompt = joinAP();
        promptField.value = prompt;
        promptField.value = promptField.value.replace(/(<([^>]+)>)/gi, "");
        promptField.value = promptField.value.replace(/&nbsp;/gi, " ");
        updateTokenCount();
        promptField.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function updateAP(prompt) {
        let table = document.querySelector(".ap-table");
        let prompts = splitPrompt(prompt);
        let rows = table.querySelectorAll("tr");
        let table_count = rows.length;
        let prompt_count = prompts.length + 1;

        const addAP = (i) => {
            let handle = Object.assign(document.createElement("span"), {
                className: "handle",
                role: "textbox",
                id: "handle" + i,
                draggable: "true",
            });

            let ap = Object.assign(document.createElement("div"), {
                className: "ap",
                contentEditable: "true",
                draggable: "false",
                id: "ap" + i,
            });

            let prompt_row = document.createElement("tr");
            prompt_row.classList.add("ap-row");
            let handle_cell = document.createElement("td");
            let prompt_cell = document.createElement("td");

            handle_cell.appendChild(handle);
            prompt_cell.appendChild(ap);
            prompt_row.appendChild(handle_cell);
            prompt_row.appendChild(prompt_cell);
            table.appendChild(prompt_row);

            ap.oninput = e => apInputListener(e);
            ap.onkeydown = e => apKeyDownListener(e);
            ap.onmouseup = e => addWeight(e);

            handle.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                deleteAP(e);
            });

        }

        if (table_count < prompt_count) {
            for (let i = table_count; i < prompt_count; i++) {
                addAP(i);
            }
            promptField.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (prompt_count === 1 && prompts[0] === undefined) {
            addAP(0);
        }
        
        if (table_count > prompt_count) {
            for (let i = table_count; i > prompt_count; i--) {
                rows[i - 1].remove();
            }
        }
        
        updateTokenCount();
        resetDragDrop(prompts);
        prettifyInputs(document);
    }

    function deleteAP(e) {
        const rowID = e.target.id.split("handle")[1];
        const ap = document.querySelector("#ap" + rowID);
        const apText = ap.textContent;

        const commaMatch = apText + "," ? promptField.value.match("," + apText) ? true : false : false;

        if (commaMatch) {
            promptField.value = promptField.value.replace("," + apText, "");
        } else {
            promptField.value = promptField.value.replace(apText, "");
        }

        updateAP(promptField.value);
    }

    async function buildAP() {
        let apControl = document.createElement("div")
        apControl.id = "ap-wrapper";
        let table = document.createElement("table");
        table.className = "ap-table", table.id = "ap-table", table.innerHTML = `<tr class="ap-row"><th align="center"><i class="help-btn">🔀 <span class="simple-tooltip right">Reorganize</span></i></th><th align="left" style="font-weight: normal">Prompts</th></tr>`;

        let details = document.createElement("div"), apSummary = document.createElement("div");
        details.className = "ap-details", apSummary.className = "ap-summary";
        apSummary.innerHTML = `📕 AP <a href="https://github.com/cmdr2/stable-diffusion-ui/wiki/Writing-prompts" target="_blank" style="text-decoration: none;"> <i class="fa-solid fa-circle-question help-btn"><span class="simple-tooltip right">Click to learn more about writing Prompts</span></i></a><small> (<span class="token-count">${countTokens(promptField.value)}</span>) tokens </small><div></div><button id="chat" class="chat tertiaryButton">🚀 Chat Imagine</button><button class="settings"><span id="settings">⚙️</span></button>`;
        details.appendChild(apSummary), details.appendChild(table), apControl.appendChild(details);
        
        apSummary.addEventListener("click", (e) => {
            e.preventDefault();
            table.style.display = table.style.display === "table" ? "none" : "table";
        });

        if (document.head.innerHTML.includes("EasyDreamStudio")) {
            await waitFor(['#editor-prompt']);
            const editorPrompt = document.getElementById("editor-prompt");
            editorPrompt.parentNode.insertBefore(apControl, editorPrompt.nextSibling);
        } else {
            promptField.parentNode.insertBefore(apControl, promptField.nextSibling);
        }

        const chat = document.getElementById("chat");
        chat.addEventListener("click", async e => {
            e.preventDefault();
            let prompt = promptField.value;
            const instructions = localStorage.getItem("instructions") || defaults.instructions;
            prompt = `${prompt}\n\nInstructions:\n${instructions}`;
            const settings = document.getElementById("settings");
            settings.classList.add("spin");
            promptField.value = await callOpenAI(prompt).then(response => {
                settings.classList.remove("spin");
                return response;
            });
            updateAP(promptField.value);
        });

        const settings = document.getElementById("settings");
        settings.addEventListener("click", (e) => {
            e.preventDefault();
            const labels = ["API Key", "Model", "Role", "Name", "Temperature", "Top P", "Max Tokens", "Presence Penalty", "Frequency Penalty", "Instructions"];
            const placeholders = ["key", "model", "role", "name", "temperature", "top_p", "max_tokens", "presence_penalty", "frequency_penalty", "instructions"];
            const dialog = document.createElement("dialog"), dialogContent = document.createElement("div"), closeButton = document.createElement("span"), form = document.createElement("form"), submitButton = document.createElement("button");
            dialog.classList.add("dialog");
            dialogContent.classList.add("dialog-content");
            closeButton.classList.add("close");
            closeButton.innerText = "×";
            closeButton.onclick = () => removeDialog();
            form.classList.add("settings-form");
            submitButton.classList.add("submit"); submitButton.innerText = "Save";
            submitButton.onclick = () => {
                for (let i = 0; i < 10; i++) localStorage.setItem(placeholders[i], form.children[2 * i + 1].value);
                removeDialog();
            };
            dialogContent.innerHTML = '<div class="dialog-header"><h2 class="dialog-title">AP Settings</h2></div><div class="dialog-body"></div><div class="dialog-footer"></div>';
            dialogContent.querySelector(".dialog-header").appendChild(closeButton);
            dialogContent.querySelector(".dialog-footer").appendChild(submitButton);
            dialog.appendChild(dialogContent);
            document.body.appendChild(dialog);
            dialogContent.querySelector(".dialog-body").appendChild(form);
            for (let i = 0; i < 10; i++) {
                const label = document.createElement("label"), input = i !== 9 ? document.createElement("input") : document.createElement("textarea");
                label.innerText = labels[i];
                label.classList.add("setting-label");
                label.htmlFor = input.id = placeholders[i];
                input.placeholder = labels[i];
                input.value = localStorage.getItem(placeholders[i]) || defaults[placeholders[i]];
                input.classList.add("setting");
                form.appendChild(label);
                form.appendChild(input);
            }
            form.appendChild(submitButton);
            dialog.showModal();

            const removeDialog = () => {
                dialog.close();
                dialog.style.display = "none";
            };
        });

        const handles = document.querySelectorAll(".handle");
        handles.forEach(handle => {
            handle.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                deleteAP(e);
            });
        });
        
        const aps = document.querySelectorAll(".ap");
        aps.forEach(ap => {
            ap.oninput = e => apInputListener(e);
            ap.onkeydown = e => apKeyDownListener(e);
            ap.onmouseup = e => addWeight(e);
        });
        
        prettifyInputs(document);
    }
})();