/**
    * Advanced Prompt Plugin
    * Version 0.1.0
    * Author: @3V1LXD
    * License: MIT
    * Description:  * Adds an optional collapsible advanced prompt table below the prompt field.
                    * Allows you to specify the emphasis for each prompt.
                    * Emphasis can be changed by hovering over it in the first cell of a row and scrolling with the alt key held.
                    * Can be reordered by dragging a row by its emphasis.
                    * Delete prompts by clearing the advanced prompt fields.
                    * Add prompts by typing a comma at the beginning or end of the advanced prompt fields.
*/

(function () {
    "use strict"
    var styleSheet = document.createElement("style");
    styleSheet.textContent =
        `.advanced_prompt_table input[type="text"]  {
            width: 100%;
        }

        .advanced_prompt_table {
            width: 100%;
        }

        details {
            font-size: 10pt;
        }

        summary {
            cursor: pointer;
            margin-left: 5px;
        }

        .emphasis {
            display: inline-block;
            cursor: grab;
            min-width: 50px !important;
            min-height: 1rem;
        }
        `;
    document.head.appendChild(styleSheet);

    // Build the advanced prompt table
    BuildAdvancedPrompt()

    // Add event listeners
    document.addEventListener('input', (event) => {
        if (event.target.className == 'advanced_prompt') {
            // Update the prompt field when the advanced prompt is changed
            UpdatePromptField()
        } else if (event.target.id == 'prompt') {
            // Update the advanced prompt table when the prompt field is changed
            UpdateAdvancedPrompt()
        }
    })

    document.addEventListener('wheel', (event) => {
        if (event.target.className == 'emphasis') {
            if (event.altKey) {
                // Change emphasis when the emphasis is scrolled with the alt key held
                event.preventDefault()
                if (event.deltaY < 0) {
                    if (event.target.innerHTML.includes('[')) {
                        event.target.innerHTML = event.target.innerHTML.slice(1, -1)
                    } else {
                        event.target.innerHTML = '(' + event.target.innerHTML + ')'
                    }
                } else {
                    if (event.target.innerHTML.includes('(')) {
                        event.target.innerHTML = event.target.innerHTML.slice(1, -1)
                    } else {
                        event.target.innerHTML = '[' + event.target.innerHTML + ']'
                    }
                }
                // Update the prompt field
                UpdatePromptField()
            }
        }
    }, { passive: false })

    function UpdatePromptField() {
        // Update the prompt field
        var emphasis_list = document.querySelectorAll('.emphasis')
        var advanced_prompt_list = document.querySelectorAll('.advanced_prompt')
        var prompt_list = []
        for (var i = 0; i < emphasis_list.length; i++) {
            // Get prompt list from advanced prompt table
            var emphasis = emphasis_list[i].innerHTML
            var advanced_prompt = advanced_prompt_list[i].value
            var emphasis_length = emphasis.length / 2
            var emphasis_start = emphasis.substring(0, emphasis_length)
            var emphasis_end = emphasis.substring(emphasis_length, emphasis.length)
            var first_char = advanced_prompt.substring(0, 1)
            var last_char = advanced_prompt.substring(advanced_prompt.length - 1, advanced_prompt.length)
            if (first_char == ',') {
                // Place commas outside of emphasis to create new prompts
                advanced_prompt = advanced_prompt.substring(1, advanced_prompt.length)
                emphasis_start = 'New Prompt, ' + emphasis_start
            }
            if (last_char == ',') {
                // Place commas outside of emphasis to create new prompts
                advanced_prompt = advanced_prompt.substring(0, advanced_prompt.length - 1)
                emphasis_end = emphasis_end + ', New Prompt'
            }
            if (advanced_prompt != '') {
                // Add advanced prompts to prompt list
                prompt_list.push(`${emphasis_start}${advanced_prompt}${emphasis_end}`)
            }
        }
        // Update prompt field
        promptField.value = prompt_list.join(', ')
        promptField.dispatchEvent(new Event('input', { bubbles: true }))
    }

    function UpdateAdvancedPrompt() {
        // Update the advanced prompt table
        var advancedPromptTable = document.querySelector('.advanced_prompt_table')
        // Get list of prompts
        var prompt_list = promptField.value.split(/,(?![^{]*})/)
        var table_rows = advancedPromptTable.querySelectorAll('tr')
        var table_row_count = table_rows.length
        var prompt_count = prompt_list.length + 1
        if (table_row_count > prompt_count) {
            // Remove extra rows
            for (var i = table_row_count; i > prompt_count; i--) {
                table_rows[i - 1].remove()
            }
        }
        if (table_row_count < prompt_count) {
            // Add extra rows
            for (var i = table_row_count; i < prompt_count; i++) {
                var emphasis = document.createElement('span')
                emphasis.className = 'emphasis'
                emphasis.role = 'textbox'
                var advanced_prompt = document.createElement('input')
                advanced_prompt.className = 'advanced_prompt'
                advanced_prompt.type = 'text'
                var prompt_row = document.createElement('tr')
                var emphasis_cell = document.createElement('td')
                emphasis_cell.style = 'text-align: center;'
                var prompt_cell = document.createElement('td')
                emphasis_cell.appendChild(emphasis)
                prompt_cell.appendChild(advanced_prompt)
                prompt_row.appendChild(emphasis_cell)
                prompt_row.appendChild(prompt_cell)
                advancedPromptTable.appendChild(prompt_row)
            }
            promptField.dispatchEvent(new Event('input', { bubbles: true }))
        }
        var table_rows = advancedPromptTable.querySelectorAll('tr')
        // reset the drag and drop events
        for (var i = 0; i < prompt_list.length; i++) {
            var prompt_row = table_rows[i + 1]
            prompt_row.draggable = true
            prompt_row.ondragstart = drag(i)
            prompt_row.ondragover = (e) => e.preventDefault()
            prompt_row.ondrop = drop
            var prompt = prompt_list[i].trim()
            var ap = getAPValues(prompt)
            emphasis_cell = table_rows[i + 1].querySelector('.emphasis')
            emphasis_cell.innerHTML = ap.emphasis
            emphasis_cell.id = 'emphasis[' + i + ']'
            prompt_cell = table_rows[i + 1].querySelector('.advanced_prompt')
            prompt_cell.id = 'advanced_prompt[' + i + ']'
            prompt_cell.value = ap.value
        }
        prettifyInputs(document);
    }

    function BuildAdvancedPrompt() {
        // Build the advanced prompt table
        var advancedPromptControl = document.createElement('div');
        // Get list of prompts
        var prompt_list = promptField.value.split(/,(?![^{]*})/)
        advancedPromptControl.id = 'advanced_prompt_wrapper'
        var advancedPromptTable = document.createElement('table');
        advancedPromptTable.className = 'advanced_prompt_table'
        advancedPromptTable.id = 'advanced_prompt_table'
        // Create the table header
        advancedPromptTable.innerHTML =
            `<tr>
                <th align="center">
                    <i class="help-btn">
                        ! <span class="simple-tooltip right">Emphasis</span>
                    </i>
                </th>
                <th align="left" style="width: 100%">
                    Prompts
                </th>
            </tr>`
        for (var i = 0; i < prompt_list.length; i++) {
            // Create a row for each prompt
            var prompt = prompt_list[i].trim()
            var ap = getAPValues(prompt)
            var prompt_row = document.createElement('tr')
            // Make the row draggable
            prompt_row.draggable = true
            prompt_row.ondragstart = drag(i)
            prompt_row.ondragover = (e) => e.preventDefault()
            prompt_row.ondrop = drop
            // set prompt emphasis and value
            prompt_row.innerHTML =
                `<td align="center">
                    <span class="emphasis" id="emphasis[${i}]" role="textbox">${ap.emphasis}</span>
                </td>
                <td>
                    <input type="text" class="advanced_prompt" id="advanced_prompt[${i}]" value="${ap.value}">
                </td>`
            advancedPromptTable.appendChild(prompt_row)
        }
        // make the table collapsible
        var details = document.createElement('details')
        var summary = document.createElement('summary')
        summary.innerHTML =
            `Advanced Prompt
            <a href="https://github.com/cmdr2/stable-diffusion-ui/wiki/Writing-prompts" target="_blank"><i class="fa-solid fa-circle-question help-btn"><span class="simple-tooltip right">Click to learn more about writing Prompts</span></i></a>
            <small>(optional)</small>`
        details.appendChild(summary)
        details.appendChild(advancedPromptTable)
        advancedPromptControl.appendChild(details)
        // insert the advanced prompt control after the prompt field
        promptField.parentNode.insertBefore(advancedPromptControl, promptField.nextSibling)
        prettifyInputs(document);
    }

    function drag(i) {
        // set the index of the prompt being dragged
        return function (event) {
            event.dataTransfer.setData("index", i);
        }
    }

    function drop(event) {
        // swap the prompt being dragged with the prompt being dropped on
        var source_index = event.dataTransfer.getData("index")
        var target_index = event.target.id.split('[')[1].split(']')[0]
        var prompt_list = promptField.value.split(/,(?![^{]*})/)
        var source_prompt = prompt_list[source_index]
        // remove the source prompt from the list
        prompt_list.splice(source_index, 1)
        // insert the source prompt into the list at the target index
        prompt_list.splice(target_index, 0, source_prompt.trim())
        // update the prompt field
        promptField.value = prompt_list.join(',')
        promptField.dispatchEvent(new Event('input', { bubbles: true }))
        console.log(source_index, target_index)
    }

    function getAPValues(prompt) {
        // get the emphasis and value from the prompt
        var first_char = prompt.slice(0, 1)
        var last_char = prompt.slice(-1)
        if (first_char == '{' && last_char == '}') {
            // slice off curly braces
            var emphasis = prompt.slice(0, 1) + prompt.slice(-1)
            var value = prompt.slice(1, -1).trim()
        } else if (first_char == '(' || first_char == '[') {
            // count the number of ( or [ in the prompt
            var bracket_count = 0
            for (var i = 0; i < prompt.length; i++) {
                if (prompt[i] == '(' || prompt[i] == '[') {
                    bracket_count++
                } else {
                    break
                }
            }
            // slice off the brackets
            var emphasis = prompt.slice(0, bracket_count) + prompt.slice(-bracket_count)
            var value = prompt.slice(bracket_count, -bracket_count).trim()
        } else {
            // no emphasis
            var emphasis = ''
            var value = prompt
        }
        return { emphasis: emphasis, value: value }
    }
})()
