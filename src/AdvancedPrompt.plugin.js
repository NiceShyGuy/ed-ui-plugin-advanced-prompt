/*
 * Advanced Prompt Plugin
 * Version 0.4
 * Author: @3V1LXD
 * License: MIT
 * Description:  
 * Optional collapsible advanced prompt below the prompt field.
 *
 * Features:
    - Manage: add, edit, delete, and reorder prompts/phrases
    - Commands: adjust weights, emphasis, de-emphasis, options, and blend
    - Roll: Selects a random number of image modifiers. Toggle Always On (Alt + Click): sends modifiers to Chat, Auto-Pilot, and used in Cook.
    - Cook: step through all combinations of samplers, inference steps, guidance scales, prompt strengths and multiple LoRAs.
    - Auto-Pilot: continuously prompts LLMs and renders images
    - Chat: Stream responses from remote and local LLMs with API (i.e.: OpenAI, LM Studio(CORS ENABLED))

    - Reordered prompts/phrases with drag handles.
    - R-click handle/clear field to delete prompt from table.
    - , + enter/tab to add prompt to table.
    - Alt + : to add weight to selected phrase
    - Alt + ( to emphasis to selected phrase
    - Alt + [ to de-emphasis to selected phrase
    - Alt + Shift + { to add options to selected phrase
    - Alt + ` to add blend to selected phrase
    - Alt + Scroll to change weights, emphasis, and de-emphasis on hover
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
    const makeImageButton = document.getElementById("makeImage");
    let activePrompt = null;
    let activeAutoPilot = false;
    let activeCook = false;
    let apSettings = {};
    let cookStart = {}
    let cookStop = {}
    let cookSteps = {}
    let cookSettings = {}
    let cookCount = 0;
    const defaults = {
        api_url: "https://api.openai.com/v1/chat/completions",
        api_key: "",
        model: "gpt-3.5-turbo",
        role: "user",
        name: "",
        temperature: 1,
        top_p: 1,
        max_tokens: 75,
        presence_penalty: 0,
        frequency_penalty: 0,
        instructions: `Imagine a detailed picture of the prompt. Only respond with the description of the picture in one paragraph.`,
        auto_pilot_instructions: `Imagine a detailed picture of a unique fantasy world, character, and/or characters. Only respond with the description of the picture in one paragraph.`,
        roll_modifiers: true,
        cook_sampler_start: 0,
        cook_inference_steps_start: 25,
        cook_guidance_scale_start: 7.5,
        cook_loras_start: 0.5,
        cook_prompt_strength_start: 0.8,
        cook_sampler_stop: document.getElementById("sampler_name").length,
        cook_inference_steps_stop: 50,
        cook_guidance_scale_stop: 10,
        cook_loras_stop: 1.0,
        cook_prompt_strength_stop: 1.0,
        cook_sampler_step: 1,
        cook_inference_steps_step: 5,
        cook_guidance_scale_step: 0.5,
        cook_loras_step: 0.1,
        cook_prompt_strength_step: 0.1,
    };

    styleSheet.textContent = `
        #ap-wrapper {  background: var(--background-color4); border: 1px solid var(--background-color3); border-radius: 7px; padding: 7px; margin-bottom: 10px; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.15), 0 6px 20px 0 rgba(0, 0, 0, 0.15);  }
        .ap-button { background: none; border: none; color: none; border-radius: none; }
        .ap-button:hover { background: none; border: none; color: none; border-radius: none; text-shadow: 0 0 5px var(--accent-color), -1px 0 5px var(--accent-color), 0 1px 5px var(--accent-color), 1px 0 5px var(--accent-color), 0 -1px 5px var(--accent-color), -3px 0 5px var(--accent-color), 0 3px 5px var(--accent-color), 3px 0 5px var(--accent-color), 0 -3px 5px var(--accent-color); }
        #chat span { display: inline-block; }
        .ap-summary { cursor: pointer; display: grid; grid-template-columns: auto auto auto 1fr auto auto auto auto auto; align-items: center; width: 100%; white-space: nowrap; gap: 3px; font-size: 10pt; }
        .ap-table { width: 100%; display: none; }
        .ap-row { display: grid; grid-template-columns: 32px auto; grid-gap: 10px; margin-top: 6px; }
        i { font-style: normal; }
        .ap-table th, .ap-table td { padding: 0;}
        .ap-table td:first-child { display: flex; justify-content: center; align-items: center; }
        .chat { padding-right: 10px; display: flex; justify-content: flex-start; align-items: flex-end; }
        .handle { cursor: grab; }
        .ap { -moz-user-select: text; -webkit-user-select: text; -ms-user-select: text; user-select: text; }
        .ap-settings { border-radius: none; background: none; border: none; }
        .ap-dialog { background-color: var(--background-color1); border: 1px solid var(--background-color2); border-radius: var(--input-border-radius); color: var(--text-normal); padding: 5px; }
        .ap-dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
        .ap-dialog-content { height: min-content; }
        .ap-dialog-header { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: min-content; grid-gap: 10px; height: min-content; border: none; background: none; }
        .ap-dialog-title { font-size: 12pt; font-weight: bold; width: auto; height: auto; }
        .close { color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; text-align: right; height: auto; }
        .ap-dialog-body input, .ap-settings-form textarea, .ap { accent-color: var(--accent-color); background: var(--input-background-color); border: 2px solid var(--background-color2); border-radius: var(--input-border-radius); width: 100%; padding: 4px; }
        .ap-dialog-body input[type="checkbox"] { width: min-content; }
        .ap-dialog-body input:focus, .ap-settings-form textarea:focus, .ap:focus { border: 2px solid var(--accent-color); outline: none; }

        .ap-settings-form textarea::-webkit-resizer { background-color: var(--background-color2); border: 2px solid var(--background-color2); }
        .ap-settings-form { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-gap: 10px; align-items: center; }

        .ap-settings-form label { text-align: center; font-size: 9pt; }
        .ap-settings-form input { text-align: center; font-size: 9pt; }
        .ap-settings-form input, textarea { grid-column: 2 / span 2; font-size: 9pt; }
        .ap-settings-form button { grid-column: 1 / span 3; margin-top: 10px; padding: 10px 0; font-size: 9pt; }
        
        .ap-settings-form label[for="model"], .ap-settings-form input[id="model"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="role"] { grid-column: 2 / span 1; grid-row: 3 / span 1; }
        .ap-settings-form input[id="role"] { grid-column: 2 / span 1; grid-row: 4 / span 1; }
        .ap-settings-form label[for="name"] { grid-column: 3 / span 1; grid-row: 3 / span 1; }
        .ap-settings-form input[id="name"] { grid-column: 3 / span 1; grid-row: 4 / span 1; }

        .ap-settings-form label[for="temperature"], .ap-settings-form input[id="temperature"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="top_p"] { grid-column: 2 / span 1; grid-row: 5 / span 1; }
        .ap-settings-form input[id="top_p"] { grid-column: 2 / span 1; grid-row: 6 / span 1; }
        .ap-settings-form label[for="max_tokens"] { grid-column: 3 / span 1; grid-row: 5 / span 1; }
        .ap-settings-form input[id="max_tokens"] { grid-column: 3 / span 1; grid-row: 6 / span 1; }

        .ap-settings-form label[for="presence_penalty"], .ap-settings-form input[id="presence_penalty"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="frequency_penalty"] { grid-column: 2 / span 1; grid-row: 7 / span 1; }
        .ap-settings-form input[id="frequency_penalty"] { grid-column: 2 / span 1; grid-row: 8 / span 1; }
        .ap-settings-form label[for="roll_modifiers"] { grid-column: 3 / span 1; grid-row: 7 / span 1; }
        .ap-settings-form input[id="roll_modifiers"] { grid-column: 3 / span 1; grid-row: 8 / span 1; }

        .ap-settings-form label[for="cook_sampler_start"], .ap-settings-form input[id="cook_sampler_start"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="cook_sampler_stop"] { grid-column: 2 / span 1; grid-row: 12 / span 1; }
        .ap-settings-form input[id="cook_sampler_stop"] { grid-column: 2 / span 1; grid-row: 13 / span 1; }
        .ap-settings-form label[for="cook_sampler_step"] { grid-column: 3 / span 1; grid-row: 12 / span 1; }
        .ap-settings-form input[id="cook_sampler_step"] { grid-column: 3 / span 1; grid-row: 13 / span 1; }

        .ap-settings-form label[for="cook_inference_steps_start"], .ap-settings-form input[id="cook_inference_steps_start"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="cook_inference_steps_stop"] { grid-column: 2 / span 1; grid-row: 14 / span 1; }
        .ap-settings-form input[id="cook_inference_steps_stop"] { grid-column: 2 / span 1; grid-row: 15 / span 1; }
        .ap-settings-form label[for="cook_inference_steps_step"] { grid-column: 3 / span 1; grid-row: 14 / span 1; }
        .ap-settings-form input[id="cook_inference_steps_step"] { grid-column: 3 / span 1; grid-row: 15 / span 1; }

        .ap-settings-form label[for="cook_guidance_scale_start"], .ap-settings-form input[id="cook_guidance_scale_start"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="cook_guidance_scale_stop"] { grid-column: 2 / span 1; grid-row: 16 / span 1; }
        .ap-settings-form input[id="cook_guidance_scale_stop"] { grid-column: 2 / span 1; grid-row: 17 / span 1; }
        .ap-settings-form label[for="cook_guidance_scale_step"] { grid-column: 3 / span 1; grid-row: 16 / span 1; }
        .ap-settings-form input[id="cook_guidance_scale_step"] { grid-column: 3 / span 1; grid-row: 17 / span 1; }
        
        .ap-settings-form label[for="cook_loras_start"], .ap-settings-form input[id="cook_loras_start"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="cook_loras_stop"] { grid-column: 2 / span 1; grid-row: 18 / span 1; }
        .ap-settings-form input[id="cook_loras_stop"] { grid-column: 2 / span 1; grid-row: 19 / span 1; }
        .ap-settings-form label[for="cook_loras_step"] { grid-column: 3 / span 1; grid-row: 18 / span 1; }
        .ap-settings-form input[id="cook_loras_step"] { grid-column: 3 / span 1; grid-row: 19 / span 1; }
        
        .ap-settings-form label[for="cook_prompt_strength_start"], .ap-settings-form input[id="cook_prompt_strength_start"] { grid-column: 1 / span 1; }
        .ap-settings-form label[for="cook_prompt_strength_stop"] { grid-column: 2 / span 1; grid-row: 20 / span 1; }
        .ap-settings-form input[id="cook_prompt_strength_stop"] { grid-column: 2 / span 1; grid-row: 21 / span 1; }
        .ap-settings-form label[for="cook_prompt_strength_step"] { grid-column: 3 / span 1; grid-row: 20 / span 1; }
        .ap-settings-form input[id="cook_prompt_strength_step"] { grid-column: 3 / span 1; grid-row: 21 / span 1; }

        .drag-handle { display: inline-block; cursor: grab; min-width: 50px !important; min-height: 1rem; }
        .weighted-words { display: inline-block; color: hsl(79,60%,50%);}
        .emphasis-words { display: inline-block; color: hsl(200,60%,50%);}
        .de-emphasis-words { display: inline-block; color: hsl(0,60%,50%);}
        .blended-words { display: inline-block; color: hsl(24,60%,50%);}
        .option-words { display: inline-block; color: hsl(50,60%,50%);}
        .bang { display: inline-block; color: hsl(50,60%,50%);}
        #ap-settings { transition: none; }
        .toggled { text-shadow: 0 0 5px var(--accent-color), -1px 0 5px var(--accent-color), 0 1px 5px var(--accent-color), 1px 0 5px var(--accent-color), 0 -1px 5px var(--accent-color), -3px 0 5px var(--accent-color), 0 3px 5px var(--accent-color), 3px 0 5px var(--accent-color), 0 -3px 5px var(--accent-color); }
        .spin { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(359deg); } }
        .typing { animation: typing 1s steps(4, end) infinite; overflow: hidden; }
        @keyframes typing { 0% { width: 0; } 50% { width: 100%; } 100% { width: 0; } }
    `;
    document.head.appendChild(styleSheet);

    // localStorage.clear();
    await buildAP();
    updateAP(promptField.value);
    loadSettings();

    function loadSettings() {
        const roll = document.getElementById("roll");
        const rollI = roll.querySelector("i");
        for (const key in defaults) {
            if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, defaults[key]);
            }
            if (key.includes("cook")) {
                if (key.includes("sampler") || key.includes("inference_steps")) {
                    // round to whole number with no decimal places
                    apSettings[key] = Math.round(parseFloat(localStorage.getItem(key)));
                } else {
                    // round to single decimal place or whole number
                    apSettings[key] = round(parseFloat(localStorage.getItem(key)));
                }
            } else {
                apSettings[key] = localStorage.getItem(key);
                if (key === "roll_modifiers") {
                    if (apSettings[key] === "true") {
                        rollI.classList.add("toggled");
                    } else {
                        rollI.classList.remove("toggled");
                    }
                }
            }
        }
        loadCookSettings();
    }

    function buildSettings() {
        loadSettings();
        const labels = ["Api Url", "API Key", "Model", "Role", "Name", "Temperature", "Top P", "Max Tokens", "Presence Penalty", "Frequency Penalty", "Roll Modifiers", "Instructions", "Auto Pilot Instructions", "Cook Sampler Start", "Cook Sampler Stop", "Cook Sampler Step", "Cook Inference Steps Start", "Cook Inference Steps Stop", "Cook Inference Steps Step", "Cook Guidance Scale Start", "Cook Guidance Scale Stop", "Cook Guidance Scale Step", "Cook LoRAs Start", "Cook LoRAs Stop", "Cook LoRAs Step", "Cook Prompt Strength Start", "Cook Prompt Strength Stop", "Cook Prompt Strength Step"];
        const placeholders = labels.map(label => label.replace(/ /g, "_").toLowerCase());

        const dialog = document.createElement("dialog"), dialogContent = document.createElement("div"), closeButton = document.createElement("span"), form = document.createElement("div"), submitButton = document.createElement("button");
        dialog.classList.add("ap-dialog");
        dialogContent.classList.add("ap-dialog-content");
        form.classList.add("ap-settings-form");
        dialogContent.innerHTML = '<div class="ap-dialog-header"><h2 class="ap-dialog-title">LLM Settings</h2></div><div class="ap-dialog-body"></div><div class="ap-dialog-footer"></div>';
        dialogContent.querySelector(".ap-dialog-header").appendChild(closeButton);
        dialogContent.querySelector(".ap-dialog-footer").appendChild(submitButton);
        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);
        dialogContent.querySelector(".ap-dialog-body").appendChild(form);
        for (let i = 0; i < labels.length; i++) {
            const label = document.createElement("label")
            label.innerText = labels[i];
            label.classList.add("setting-label");
            if (placeholders[i] === "cook_sampler_start") {
                const cookSettingsTitle = document.createElement("h2");
                cookSettingsTitle.innerText = "Cook Settings";
                cookSettingsTitle.style = "grid-column: 1 / span 3;";
                cookSettingsTitle.classList.add("ap-dialog-title");
                form.appendChild(cookSettingsTitle);
            }
            let input = null;
            if (placeholders[i] === "instructions") {
                input = document.createElement("textarea");
            } else if (placeholders[i] === "auto_pilot_instructions") {
                input = document.createElement("textarea");
            } else if (placeholders[i] ===  "api_key") {
                input = document.createElement("input");
                input.type = "password";
            } else if (placeholders[i] ===  "name") {
                input = document.createElement("input");
                input.type = "password";
            } else if (placeholders[i] ===  "roll_modifiers") {
                input = document.createElement("input");
                input.type = "checkbox";
                input.onchange = () => {
                    input.value = input.checked;
                };
            } else if (placeholders[i].includes("cook")) {
                label.innerText = label.innerText.replace("Cook ", "");
                if (label.innerText.includes("Stop")) {
                    label.innerText = "Stop";
                } else if (label.innerText.includes("Step") && !label.innerText.includes("Start")) {
                    label.innerText = "Step";
                }
                // replace last space with new line
                label.innerText = label.innerText.replace(/ ([^ ]*)$/, "\n$1");
                input = document.createElement("input");
                input.type = "number";
                input.step = "any";
            } else {
                input = document.createElement("input");
            }

            input.placeholder = defaults[placeholders[i]];
            input.value = apSettings[placeholders[i]];
            if (input.type === "checkbox") {
                input.checked = input.value === "true" ? true : false;
            }
            input.classList.add("setting");
            label.htmlFor = input.id = placeholders[i];

            form.appendChild(label);
            form.appendChild(input);
        }
        form.appendChild(submitButton);
        dialog.showModal();

        submitButton.classList.add("submit"); submitButton.innerText = "Save";
        submitButton.onclick = () => {
            for (let i = 0; i < labels.length; i++) {
                const inputValue = form.querySelector(`#${placeholders[i]}`).value;
                if (inputValue === "") {
                    localStorage.setItem(placeholders[i], defaults[placeholders[i]]);
                } else {
                    localStorage.setItem(placeholders[i], inputValue);
                }
            } 
            loadSettings();
            removeDialog();
        };

        closeButton.classList.add("close");
        closeButton.innerText = "×";
        closeButton.onclick = () => removeDialog();

        const removeDialog = () => {
            // remove dialog from dom
            const dialogParent = dialog.parentNode;
            dialogParent.removeChild(dialog);
        };
    }

    function loadCookSettings() {
        cookStart = {
            sampler: apSettings.cook_sampler_start,
            inference_steps: apSettings.cook_inference_steps_start,
            guidance_scale: apSettings.cook_guidance_scale_start,
            loras: apSettings.cook_loras_start,
            prompt_strength: apSettings.cook_prompt_strength_start,
        }
    
        cookStop = {
            sampler: apSettings.cook_sampler_stop,
            inference_steps: apSettings.cook_inference_steps_stop,
            guidance_scale: apSettings.cook_guidance_scale_stop,
            loras: apSettings.cook_loras_stop,
            prompt_strength: apSettings.cook_prompt_strength_stop,
        }
    
        cookSteps = {
            sampler: apSettings.cook_sampler_step,
            inference_steps: apSettings.cook_inference_steps_step,
            guidance_scale: apSettings.cook_guidance_scale_step,
            loras: apSettings.cook_loras_step,
            prompt_strength: apSettings.cook_prompt_strength_step,
        }
    
        cookSettings = {
            sampler: apSettings.cook_sampler_start,
            inference_steps: apSettings.cook_inference_steps_start,
            guidance_scale: apSettings.cook_guidance_scale_start,
            loras: [apSettings.cook_loras_start],
            prompt_strength: apSettings.cook_prompt_strength_start,
        }
    
        cookCount = 0;
    }

    function round(num) {
        return Math.round(num * 10) / 10;
    }

    async function cooking() {
        if (apSettings.roll_modifiers === "true") await rollModifiers();
        const sampler = document.getElementById("sampler_name");
        const inferenceSteps = document.getElementById("num_inference_steps");
        const promptStrengthContainer = document.getElementById("prompt_strength_container");
        const promptStrength = document.getElementById("prompt_strength");
        const guidanceScale = document.getElementById("guidance_scale");
        const loras = document.querySelector(".model_entries").querySelectorAll(".model_weight");
        const numLoRAs = loras.length;

        sampler.selectedIndex = cookSettings.sampler;
        inferenceSteps.value = cookSettings.inference_steps;
        promptStrength.value = cookSettings.prompt_strength;
        guidanceScale.value = cookSettings.guidance_scale;
        for (let i = 0; i < numLoRAs; i++) {
            if (!cookSettings.loras[i]) cookSettings.loras[i] = cookStart.loras;
            loras[i].value = cookSettings.loras[i];
        }

        makeImageButton.click();

        const imageTaskContainer = document.querySelector(".imageTaskContainer");
        const progressBar = imageTaskContainer.querySelector(".progress-bar");
        let fireOnce = false;
        const progressBarObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (!mutation.target.classList.contains("active")) {
                    if (!fireOnce && activeCook) {
                        fireOnce = true;
                        cookCount++;
                        cooking();
                        progressBarObserver.disconnect();
                    } else if (!fireOnce && !activeCook) {
                        fireOnce = true;
                        cookCount++;
                        const cookButton = document.getElementById("cook");
                        const cookButtonI = cookButton.querySelector("i");
                        cookButtonI.classList.remove("toggled");
                        
                        const message = `🍳 Cooked ${cookCount} Images.`;
                        const dialog = document.createElement("dialog"), dialogContent = document.createElement("div"), closeButton = document.createElement("span"), form = document.createElement("div"), submitButton = document.createElement("button");
                        dialog.classList.add("ap-dialog");
                        dialog.style = "min-width: unset;";
                        dialogContent.classList.add("ap-dialog-content");
                        dialogContent.innerHTML = '<div class="ap-dialog-header"><h2 class="ap-dialog-title" style="font-size: 24pt;">🧑‍🍳 Cooking Complete</h2></div><div class="ap-dialog-body" style="text-align: center; font-size: 16pt;"></div><div class="ap-dialog-footer"></div>';
                        dialogContent.querySelector(".ap-dialog-header").appendChild(closeButton);
                        dialogContent.querySelector(".ap-dialog-footer").appendChild(submitButton);
                        dialog.appendChild(dialogContent);
                        document.body.appendChild(dialog);
                        dialogContent.querySelector(".ap-dialog-body").innerHTML = message;
                        dialog.showModal();

                        closeButton.classList.add("close");
                        closeButton.innerText = "×";
                        closeButton.onclick = () => removeDialog();

                        submitButton.classList.add("submit"); submitButton.innerText = "Okay";
                        submitButton.style = `
                            padding: 10px;
                            margin-top: 10px;
                            float: right;
                            font-size: 12pt;
                            `;
                        submitButton.onclick = () => {
                            removeDialog();
                        };

                        const removeDialog = () => {
                            // remove dialog from dom
                            const dialogParent = dialog.parentNode;
                            dialogParent.removeChild(dialog);
                        };

                        // reset cook count
                        cookCount = 0;
                        progressBarObserver.disconnect();
                    } else {
                        progressBarObserver.disconnect();
                    }
                }
            });
        });
        progressBarObserver.observe(progressBar, { attributes: true, attributeFilter: ["style"] });

        // cycle through settings
        const lora0 = document.getElementById("lora_0");
        if (lora0.value !== "None") { cookSettings.loras[numLoRAs - 1] = round(cookSettings.loras[numLoRAs - 1] + cookSteps.loras);
        } else if (promptStrengthContainer.style.display !== "none") { cookSettings.prompt_strength = round(cookSettings.prompt_strength + cookSteps.prompt_strength);
        } else { cookSettings.guidance_scale = round(cookSettings.guidance_scale + cookSteps.guidance_scale); }
        if (numLoRAs > 1){
            for (let i = numLoRAs - 1; i > 0; i--) {
                if (cookSettings.loras[i] > cookStop.loras) {
                    cookSettings.loras[i] = cookStart.loras;
                    // cookSettings.loras[i - 1] += cookSteps.loras;
                    cookSettings.loras[i - 1]  = round(cookSettings.loras[i - 1] + cookSteps.loras);
                }
            }
        }
        if (cookSettings.loras[0] > cookStop.loras) { cookSettings.loras[0] = cookStart.loras;
            if (promptStrengthContainer.style.display !== "none") { cookSettings.prompt_strength = round(cookSettings.prompt_strength + cookSteps.prompt_strength); 
            } else { cookSettings.guidance_scale = round(cookSettings.guidance_scale + cookSteps.guidance_scale); }}
        if (cookSettings.prompt_strength > cookStop.prompt_strength) { cookSettings.prompt_strength = cookStart.prompt_strength; cookSettings.guidance_scale = round(cookSettings.guidance_scale + cookSteps.guidance_scale); }
        if (cookSettings.guidance_scale > cookStop.guidance_scale) { cookSettings.guidance_scale = cookStart.guidance_scale; cookSettings.inference_steps += cookSteps.inference_steps; }
        if (cookSettings.inference_steps > cookStop.inference_steps) { cookSettings.inference_steps = cookStart.inference_steps; cookSettings.sampler += cookSteps.sampler; }
        if (cookSettings.sampler > cookStop.sampler) { 
            cookSettings = {
                sampler: cookStart.sampler,
                inference_steps: cookStart.inference_steps,
                guidance_scale: cookStart.guidance_scale,
                loras: [cookStart.loras],
                prompt_strength: cookStart.prompt_strength,
            }
            sampler.selectedIndex = cookSettings.sampler;
            inferenceSteps.value = cookSettings.inference_steps;
            guidanceScale.value = cookSettings.guidance_scale;
            promptStrength.value = cookSettings.prompt_strength;
            for (let i = 0; i < numLoRAs; i++) {
                loras[i].value = cookSettings.loras;
            }
            activeCook = false;
        }
    }

    function cook() {
        const cookButton = document.getElementById("cook");
        const cookButtonI = cookButton.querySelector("i");
        const autopilot = document.getElementById("auto-pilot");
        const autopilotI = autopilot.querySelector("i");
        if (!activeCook) {
            if (activeAutoPilot) {
                activeAutoPilot = false;
                autopilotI.classList.remove("toggled");
            }
            activeCook = true;
            cookButtonI.classList.add("toggled");
            loadSettings();
            cooking();
        } else {
            activeCook = false;
            cookButtonI.classList.remove("toggled");
        }
    }

    function autoPilot() {
        const autopilot = document.getElementById("auto-pilot");
        const autopilotI = autopilot.querySelector("i");
        const cookButton = document.getElementById("cook");
        const cookButtonI = cookButton.querySelector("i");
        if (!activeAutoPilot) {
            if (activeCook) {
                activeCook = false;
                cookButtonI.classList.remove("toggled");
            }
            activeAutoPilot = true;
            autopilotI.classList.add("toggled");
            const chat = document.getElementById("chat");
            chat.click();
        } else {
            activeAutoPilot = false;
            autopilotI.classList.remove("toggled");
        }
    }

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
            } else if (ch === '.' && prompt[prompt.indexOf(ch) + 1] === ' ') {
                if (buffer.trim() !== '') {
                    result.push(buffer.trim());
                }
                buffer = '';
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

    async function requestLLM(prompt) {
        const chatButton = document.getElementById("chat");
        const chatSpan = chatButton.querySelector("span");
        chatSpan.classList.add("typing");

        const get = key => localStorage.getItem(key);
        const data = {
            messages: [{ role: "user", content: `${prompt}`, name: get("name") || "" }],
            model: get("model") || "gpt-3.5-turbo",
            top_p: parseInt(get("top_p")) || 1,
            presence_penalty: parseInt(get("presence_penalty")) || 0,
            frequency_penalty: parseInt(get("frequency_penalty")) || 0,
            temperature: parseInt(get("temperature")) || 0,
            max_tokens: parseInt(get("max_tokens")) || 75,
            stream: true,
        };

        try {
            const url = get("api_url") || apSettings.api_url;
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${get("api_key")}` },
                body: JSON.stringify(data),
            }).then((response) => {
                const reader = response.body.getReader();
                promptField.value = "";
                promptField.dispatchEvent(new Event("input", { bubbles: true }));
                reader.read().then(function pump({ done, value }) {
                    if (done) return;
                    const decoder = new TextDecoder();
                    value = decoder.decode(value);
                    value = value.substring(6);
                    try {
                        value = JSON.parse(value).choices[0].delta.content;
                    } catch (error) {
                        value = '';
                    }
                    // remove all colons
                    value = value.replace(/:/g, "");
                    // remove all new lines
                    value = value.replace(/\n/g, "");
                    promptField.value += value;
                    promptField.dispatchEvent(new Event("input", { bubbles: true }));
                    return reader.read().then(pump);
                }).then(async () => {
                    // settingsIcon.classList.remove("spin");
                    chatSpan.classList.remove("typing");
                    promptField.dispatchEvent(new Event("input", { bubbles: true }));
                    if (activeAutoPilot && !activeCook) {
                        makeImageButton.click();
                        const imageTaskContainer = document.querySelector(".imageTaskContainer");
                        const progressBar = imageTaskContainer.querySelector(".progress-bar");
                        let fireOnce = false;
                        const observer = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                if (!mutation.target.classList.contains("active")) {
                                    if (activeAutoPilot && !fireOnce) {
                                        fireOnce = true;
                                        const chat = document.getElementById("chat");
                                        chat.click();
                                    } else if (fireOnce) {
                                        observer.disconnect();
                                    }
                                }
                            });
                        });
                        observer.observe(progressBar, { attributes: true });
                    }
                }).catch((error) => {
                    console.log(`LLM Error: ${error}`);
                    // settingsIcon.classList.remove("spin");
                    chatSpan.classList.remove("typing");
                });
            });
        } catch (error) {
            console.log(`LLM Error: ${error}`);
            // settingsIcon.classList.remove("spin");
            chatSpan.classList.remove("typing");
        }
    }

    async function rollModifiers(newPrompt) {
        const modifiers = await fetch("/get/modifiers").then(response => response.json());
        activeTags = [];
        const randCategories = Math.floor(Math.random() * modifiers.length) + 1;
        newPrompt = 'Suggested style modifiers: \n';
        let uniqueCategories = [];
        for (let i = 0; i < randCategories; i++) {
            const catRand = Math.floor(Math.random() * modifiers.length);
            if (uniqueCategories.includes(catRand)) {
                i--;
                continue;
            } else {
                uniqueCategories.push(catRand);
            }
            const category = modifiers[catRand];
            newPrompt += category.category + ": ";
            const randModifiers = Math.floor(Math.random() * category.modifiers.length) + 1;
            let uniqueModifiers = [];
            for (let j = 0; j < randModifiers; j++) {
                const modRand = Math.floor(Math.random() * category.modifiers.length);
                if (uniqueModifiers.includes(modRand)) {
                    j--;
                    continue;
                } else {
                    uniqueModifiers.push(modRand);
                }
                const modifier = category.modifiers[modRand];
                newPrompt += modifier.modifier + ", ";
                // add modifier to active array
                const modifierCard = document.querySelector(`.modifier-card[data-full-name="${modifier.modifier}"]`);
                activeTags.push({
                    name: modifier.modifier,
                    element: modifierCard.cloneNode(true),
                    originElement: modifierCard,
                    previews: modifierCard.previews,
                })
            }
            // remove the last comma and space
            newPrompt = newPrompt.substring(0, newPrompt.length - 2);
            newPrompt += "\n";
        }
        refreshTagsList();
        // remove the last comma and space
        newPrompt = newPrompt.substring(0, newPrompt.length - 2);
        newPrompt += "\n\n";
        return newPrompt;
    }

    async function buildAP() {
        let apControl = document.createElement("div")
        apControl.id = "ap-wrapper";
        let table = document.createElement("table");
        table.className = "ap-table", table.id = "ap-table", table.innerHTML = `<tr class="ap-row"><th align="center"><i class="help-btn">🔀 <span class="simple-tooltip right">Reorganize</span></i></th><th align="left" style="display: flex; align-items: center; font-weight: normal; font-size: 10pt;">Prompts</th></tr>`;

        let details = document.createElement("div"), apSummary = document.createElement("div");
        details.className = "ap-details", apSummary.className = "ap-summary";
        apSummary.innerHTML = `
            <span id="ap-title"><i class="icon">📕</i> AP</span><a href="https://github.com/cmdr2/stable-diffusion-ui/wiki/Writing-prompts" target="_blank" style="text-decoration: none;">
            <i class="fa-solid fa-circle-question help-btn"><span class="simple-tooltip right">Click to learn more about writing Prompts</span></i></a><small> (<span class="token-count">${countTokens(promptField.value)}</span>) tokens</small>
            <div></div>
            <button id="roll" class="ap-button help-btn"><i class="icon">🎲</i><span class="simple-tooltip top" style="text-shadow: none;">Roll</span></button>
            <button id="cook" class="ap-button help-btn"><i class="icon">🍳</i><span class="simple-tooltip top" style="text-shadow: none;">Cook</span></button>
            <button id="auto-pilot" class="ap-button help-btn"><i class="icon">✈️</i><span class="simple-tooltip top" style="text-shadow: none;">Auto-Pilot</span></button>
            <button id="chat" class="ap-button chat"><i class="icon">💬</i><span style="text-shadow: none;"> Chat</span></button>
            <button id="ap-settings" class="ap-button help-btn"><i id="ap-settings-icon" class="icon">⚙️</i><span class="simple-tooltip top" style="text-shadow: none;">Settings</span></button>
            `;
        details.appendChild(apSummary), details.appendChild(table), apControl.appendChild(details);

        if (document.head.innerHTML.includes("EasyDreamStudio")) {
            await waitFor(['#editor-prompt']);
            const editorPrompt = document.getElementById("editor-prompt");
            editorPrompt.parentNode.insertBefore(apControl, editorPrompt.nextSibling);
        } else {
            promptField.parentNode.insertBefore(apControl, promptField.nextSibling);
        }
        
        const apTitle = document.getElementById("ap-title");
        apTitle.addEventListener("click", (e) => {
            e.preventDefault();
            table.style.display = table.style.display === "table" ? "none" : "table";
        });

        const chat = document.getElementById("chat");
        chat.addEventListener("click", async e => {
            e.preventDefault();
            let prompt = promptField.value;
            const instructions = activeAutoPilot ? localStorage.getItem("auto_pilot_instructions") || apSettings.auto_pilot_instructions : localStorage.getItem("instructions") || apSettings.instructions;
            const seed = Math.floor(Math.random() * 90000000) + 10000000;
            let newPrompt = activeAutoPilot !== true ? `Prompt: ${prompt}\n\n` : ""; // bypass prompt if autopilot is active
            
            if (apSettings.roll_modifiers === "true") {
                newPrompt += await rollModifiers(newPrompt);
            }
            newPrompt += `Seed:${seed}\n\nInstructions: ${instructions}\n\nResponse: `;
            await requestLLM(newPrompt);
        });

        const roll = document.getElementById("roll");
        const rollI = roll.querySelector("i");
        roll.addEventListener("click", (e) => {
            e.preventDefault();
            if(e.altKey) {
                // toggle roll modifiers
                if (apSettings.roll_modifiers === "true") {
                    apSettings.roll_modifiers = "false";
                    rollI.classList.remove("toggled");
                } else {
                    apSettings.roll_modifiers = "true";
                    rollI.classList.add("toggled");
                }
                localStorage.setItem("roll_modifiers", apSettings.roll_modifiers);
            } else {
                rollModifiers();
            }
        });

        const autopilot = document.getElementById("auto-pilot");
        autopilot.addEventListener("click", () => {
            autoPilot();
        });

        const cookBtn = document.getElementById("cook");
        const cookBtnI = cookBtn.querySelector("i");
        cookBtn.addEventListener("click", () => {
            // if holding alt then reset cook settings
            if (activeCook) {
                const sampler = document.getElementById("sampler_name");
                const inferenceSteps = document.getElementById("num_inference_steps");
                const promptStrength = document.getElementById("prompt_strength");
                const guidanceScale = document.getElementById("guidance_scale");
                const loras = document.querySelector(".model_entries").querySelectorAll(".model_weight");
                const numLoRAs = loras.length;
                activeCook = false;
                cookSettings = {
                    sampler: cookStart.sampler,
                    inference_steps: cookStart.inference_steps,
                    guidance_scale: cookStart.guidance_scale,
                    prompt_strength: cookStart.prompt_strength,
                    loras: [cookStart.loras],
                };
                sampler.selectedIndex = cookSettings.sampler;
                inferenceSteps.value = cookSettings.inference_steps;
                guidanceScale.value = cookSettings.guidance_scale;
                promptStrength.value = cookSettings.prompt_strength;
                for (let i = 0; i < numLoRAs; i++) {
                    loras[i].value = cookSettings.loras;
                }
                cookBtnI.classList.remove("toggled");
            } else {
                cook();
            }
        });

        const apSettingsBtn = document.getElementById("ap-settings");
        apSettingsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            buildSettings();
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

        const stopImage = document.getElementById("stopImage");
        stopImage.addEventListener("click", () => {
            if (activeAutoPilot) autoPilot();
            if (activeCook) cook();
        });
        
        prettifyInputs(document);
    }
})();