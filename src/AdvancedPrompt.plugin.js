/**
 * Advanced Prompt Plugin
 * Version 0.2
 * Author: @3V1LXD
 * License: MIT
 * Description:  
 * Adds an optional collapsible advanced prompt table below the prompt field.
 * Can be reordered by dragging a row by its drag handle.
 * Delete prompts by right-clicking on its drag handle.
 * Add prompts by typing a comma at the beginning or end of the advanced prompt fields.
 * Insert prompts by typing a comma after the prompt and hitting enter or tab.
 */

(function () {
    setTimeout(() => {
        // wait for page to load
        "use strict";
        let styleSheet = document.createElement("style");

        styleSheet.textContent = `
            #ap-wrapper {  background: var(--background-color4); border: 1px solid var(--background-color3); border-radius: 7px; padding: 7px; margin-bottom: 15px; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.15), 0 6px 20px 0 rgba(0, 0, 0, 0.15);  }
            .ap-summary { cursor: pointer; display: grid; grid-template-columns: auto auto auto 1fr auto auto; align-items: center; width: 100%; white-space: nowrap; gap: 3px; }
            .ap-table { width: 100%; display: none; }
            .ap-row { display: grid; grid-template-columns: 32px auto; grid-gap: 10px; }
            i { font-style: normal; }
            .ap-table th, .ap-table td { padding: 0; }
            .chat { padding-right: 10px; }
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
            .weighted-word { display: inline-block; background-color: var(--accent-color); color: white; border-radius: 3px; padding: 2px 4px; margin: 2px; }
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
            instructions: `1. Take the original prompt and imagine the desired image with as much detail as possible.
                2. Generate a new prompt that is more specific and descriptive to guide Stable Diffusion.
                3. Use clear, detailed phrases separating ideas by categories with a comma to describe the desired image. 
                4. Categories should include but not limited to subject, acting, style, and camera.
                5. Mention important characteristics, such as colors, shapes, sizes, and positions.
                6. Keep the new prompt concise and avoid using overly complex language or concepts. Avoid ambiguity and generic terms.
                7. Image Modifiers are required such as art styles, tags, and artist names (if they match the style) to the end of the prompt. (e.g. "Painting, Detailed and Intricate, Impressionism, by Bob Eggleton")
                8. Do not include any other punctuation other than commas.
                9. Do not include any other form of information other than the new prompt.
                10. Do not use a code block or quotation marks.
                11. Restrict response to no more than 75 tokens but try to reach the maximum limit without losing context.

                New Prompt Example:

                an astronaut in a golden space suit, riding on the back of a majestic black horse, galloping on the moon towards the camera with its mane and tail flowing in the wind, with the Earth setting in the background, Photograph, Landscape, by NASA`,
        };

        document.head.appendChild(styleSheet);
        buildAdvancedPrompt();
        let activePrompt = null;

        document.getElementById("prompt").addEventListener("input", e => {
            let p = e.target.value.split(",");
            if (activePrompt && p[0] !== " New Prompt" && p[p.length - 1] !== " New Prompt") return;
            activePrompt = e.target;
            updateAdvancedPrompt(e.target.value);
            activePrompt = null;
        });

        const aps = document.querySelectorAll(".ap");
        aps.forEach(ap => {
            ap.oninput = e => apInputListener(e);
            ap.onkeydown = e => apKeyDownListener(e);
        });


        function apInputListener(event) {
            activePrompt = event.target;
            updatePromptField();
            activePrompt = null;
        }

        function apKeyDownListener(event) {
            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                event.target.blur();
                updateAdvancedPrompt(promptField.value);
            }
        }

        const chat = document.querySelector(".chat");
        chat.addEventListener("click", async e => {
            e.preventDefault();
            let prompt = promptField.value;
            const instructions = defaults.instructions //localStorage.getItem("instructions") || defaults.instructions;
            prompt = `${prompt}\n\nInstructions:\n${instructions}`;
            const settings = document.getElementById("settings");
            settings.classList.add("spin");
            promptField.value = await callOpenAI(prompt).then(response => {
                settings.classList.remove("spin");
                return response;
            });
            updateAdvancedPrompt(promptField.value);
        });

        const settings = document.querySelector(".settings");
        settings.addEventListener("click", (event) => {
            event.preventDefault();
            const labels = ["API Key", "Model", "Role", "Name", "Temperature", "Top P", "Max Tokens", "Presence Penalty", "Frequency Penalty", "Instructions"];
            const placeholders = ["key", "model", "role", "name", "temperature", "top_p", "max_tokens", "presence_penalty", "frequency_penalty", "instructions"];
            const dialog = document.createElement("dialog"), dialogContent = document.createElement("div"), closeButton = document.createElement("span"), form = document.createElement("form"), submitButton = document.createElement("button");
            dialog.classList.add("dialog");
            dialogContent.classList.add("dialog-content");
            closeButton.classList.add("close");
            closeButton.innerText = "×";
            closeButton.onclick = () => dialog.close();
            form.classList.add("settings-form");
            submitButton.classList.add("submit"); submitButton.innerText = "Save";
            submitButton.onclick = () => {
                for (let i = 0; i < 10; i++) localStorage.setItem(placeholders[i], form.children[2 * i + 1].value);
                dialog.close();
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
        });

        const handle = document.querySelector(".handle");
        handle.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            deleteAdvancedPrompt(event);
        });

        function deleteAdvancedPrompt(event) {
            const rowID = event.target.id.split("handle")[1];
            const ap = document.querySelector("#ap" + rowID);
            const apText = ap.innerHTML;

            promptField.value = rowID === "0"
                ? promptField.value.replace(apText + ",", "").replace(apText, "")
                : promptField.value.replace("," + apText, "");

            updateAdvancedPrompt(promptField.value);
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

        function updatePromptField() {
            const aps = document.querySelectorAll(".ap");
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

            const prompt = prompts.join(",");
            promptField.value = prompt;
            promptField.value = promptField.value.replace(/(<([^>]+)>)/gi, "");
            promptField.value = promptField.value.replace(/&nbsp;/gi, " ");
            updateTokenCount();
            promptField.dispatchEvent(new Event("input", { bubbles: true }));
        }

        function styleWeightedWords(text) {
            const words = text.split(",");
            const result = words.map((word) => {
                if (word.includes(":")) {
                    const [words, weight] = word.split(":");
                    if (!isNaN(parseFloat(weight))) {
                        return `<span class="weighted-word">${words}:${weight}</span>`;
                    }
                }
                return word;
            });
            return result.join(" ");
        }

        function updateAdvancedPrompt(prompt) {
            let table = document.querySelector(".ap-table");
            let prompts = prompt.split(/,(?![^{]*})/);
            let rows = table.querySelectorAll("tr");
            let table_count = rows.length;
            let prompt_count = prompts.length + 1;
            if (table_count > prompt_count) {
                for (let i = table_count; i > prompt_count; i--) {
                    rows[i - 1].remove();
                }
            }
            if (table_count < prompt_count) {
                for (let i = table_count; i < prompt_count; i++) {
                    let handle = Object.assign(document.createElement("span"), {
                        className: "handle",
                        role: "textbox",
                    });
                    let ap = Object.assign(document.createElement("div"), {
                        className: "ap",
                        contentEditable: "true",
                    });
                    let prompt_row = document.createElement("tr");
                    prompt_row.classList.add("ap-row");
                    let handle_cell = Object.assign(document.createElement("td"), {
                        style: "text-align: center;",
                    });
                    let prompt_cell = document.createElement("td");

                    handle_cell.appendChild(handle);
                    prompt_cell.appendChild(ap);
                    prompt_row.appendChild(handle_cell);
                    prompt_row.appendChild(prompt_cell);
                    table.appendChild(prompt_row);

                    ap.oninput = e => apInputListener(e);
                    ap.onkeydown = e => apKeyDownListener(e);

                    handle.addEventListener("contextmenu", (event) => {
                        event.preventDefault();
                        deleteAdvancedPrompt(event);
                    });
                }
                promptField.dispatchEvent(new Event("input", { bubbles: true }));
            }

            updateTokenCount();
            resetDragDrop(prompts);
            prettifyInputs(document);
        }


        function resetDragDrop(prompts) {
            let table = document.querySelector(".ap-table");
            let rows = table.querySelectorAll("tr");
            for (let i = 0; i < prompts.length; i++) {
                let row = rows[i + 1];
                row.draggable = true;
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
                ap.innerHTML = styleWeightedWords(prompt);
            }
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

        function buildAdvancedPrompt() {
            let apControl = document.createElement("div"), prompts = promptField.value.split(/,(?![^{]*})/);
            apControl.id = "ap-wrapper";
            let table = document.createElement("table");
            table.className = "ap-table", table.id = "ap-table", table.innerHTML = `<tr class="ap-row"><th align="center"><i class="help-btn">🔀 <span class="simple-tooltip right">Reorganize</span></i></th><th align="left" style="font-weight: normal">Prompts</th></tr>`;
            for (let i = 0; i < prompts.length; i++) {
                let ap = prompts[i], prompt_row = document.createElement("tr");
                prompt_row.classList.add("ap-row"), prompt_row.draggable = true, prompt_row.ondragstart = drag(i), prompt_row.ondragover = (e) => e.preventDefault(), prompt_row.ondrop = drop;
                prompt_row.innerHTML = `<td align="center"><span class="handle" id="handle${i}">☰</span></td><td><div class="ap" id="ap${i}" contenteditable="true">${ap}</div></td>`;
                table.appendChild(prompt_row);
            }
            let details = document.createElement("div"), apSummary = document.createElement("div");
            details.className = "ap-details", apSummary.className = "ap-summary";
            apSummary.innerHTML = `📕 AP <a href="https://github.com/cmdr2/stable-diffusion-ui/wiki/Writing-prompts" target="_blank" style="text-decoration: none;"> <i class="fa-solid fa-circle-question help-btn"><span class="simple-tooltip right">Click to learn more about writing Prompts</span></i></a><small> (<span class="token-count">${countTokens(promptField.value)}</span>) tokens </small><div></div><button class="chat tertiaryButton">🚀 Chat Imagine</button><button class="settings"><span id="settings">⚙️</span></button>`;
            details.appendChild(apSummary), details.appendChild(table), apControl.appendChild(details);

            // add event listener for apSummary click

            apSummary.addEventListener("click", (event) => {
                event.preventDefault();
                table.style.display = table.style.display === "table" ? "none" : "table";
            });

            // get plugins meta data from head
            // const plugins = document.head.querySelector("meta[name='plugins']").content.split(",");
            // console.log(plugins);
            if (document.head.innerHTML.includes("EasyDreamStudio")) {
                promptField.parentNode.insertAdjacentElement("afterend", apControl);
            } else {
                promptField.parentNode.insertBefore(apControl, promptField.nextSibling);
            }
            prettifyInputs(document);
        }

        function drag(i) {
            return function (event) {
                event.dataTransfer.setData("index", i);
            };
        }

        function drop(event) {
            const source = event.dataTransfer.getData("index");
            const target = event.target.id.split("handle")[1];
            if (target === undefined) return;
            console.log(source, target)
            let prompts = promptField.value.split(/,(?![^{]*})/);
            let source_prompt = prompts[source];
            let target_prompt = prompts[target];
            prompts[source] = target_prompt;
            prompts[target] = source_prompt;
            promptField.value = prompts.join(",");
            promptField.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }, 750);
})();