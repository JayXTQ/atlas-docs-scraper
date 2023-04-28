require("dotenv").config();
const Eris = require("eris");
const yaml = require('js-yaml');
const YAML = require('yaml')
const axios = require('axios')

const bot = new Eris(process.env.TOKEN);

bot.on("ready", async () => {
    try {
        bot.createCommand({
            name: 'docs',
            description: 'Searches the AtlasOS documentation for a specific term using Autocomplete.',
            type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT,
            options: [{
                type: 3,
                name: 'lookup',
                description: 'The term to look up.',
                required: true
            }, {
                type: 6,
                name: 'ping',
                description: 'The user to ping when the command is run.',
                required: false
            }]
        })
    } catch (error) {
        console.error(error)
    }
    console.log("Ready!");
});

bot.on("interactionCreate", async (interaction) => {
    if (interaction instanceof Eris.CommandInteraction) {
        if (interaction.data.name === "docs") {
            console.log(interaction.data.options)
            let term = interaction.data.options[0].value.toLowerCase()
            let ping = interaction.data.options[1]?.value
            let page = await collectTerms()
            page = await page.find(termTemp => termTemp["key"].toLowerCase() === term)
            if (!page) {
                interaction.createMessage("Page not found.")
                return;
            }
            if (ping) {
                interaction.createMessage(`<@!${ping}>: ${page.page}`)
            } else {
                interaction.createMessage(`${page.page}`)
            }
        }
    }
});


async function collectTerms() {
    let terms = await axios.get("https://raw.githubusercontent.com/Atlas-OS/docs/master/mkdocs.yml") // Get the mkdocs.yml file
    terms = YAML.parse(terms.data.replace("!!python/name:materialx.emoji.twemoji", "").replace("!!python/name:materialx.emoji.to_svg", "")).nav // Parse the YAML file to grab the nav element
    terms = YAML.stringify(terms) // Stringify the YAML file after grabbing the nav section
    while (terms.includes("- ")){
        terms = terms.replace("- ", "") // While the terms include a dash, remove it, it's easier to format this way
    }
    while (terms.includes("    ")){
        terms = terms.replace("    ", "") // While the terms include indents, remove them so that every item is on a new flat line
    }
    while (terms.includes(":\n")){
        terms = terms.replace(":\n", `: ${terms.split(":\n")[1].split("\n")[0].split(": ")[1]}\n`) // While the terms don't have a link provided to them, grab one from the line below it and remove the part explaining what it is
    }
    terms = terms.split("\n") // Split the terms into an array by line
    keys = [] // Create an empty array to store the keys
    for (let index of terms) {
        if(index.includes("Index")) continue; // If the index includes the word Index, skip it
        if(index === "") continue; // If the index is empty, skip it
        if(index === " ") continue; // If the index is a space, skip it
        if(!index.includes("https://")){ // If the index doesn't include https://, it's a link, not a document page
            let page = "https://docs.atlasos.net/" + index.split(": ")[1].replace("/index.md", "").replace("index.md").replace(".md", "") + "/" // Make the page into a link
            if(page === "https://docs.atlasos.net/undefined/") page = "https://docs.atlasos.net/" // If one of the parts of the string is "undefined", it is the home page. Don't know why this happens.
            keys = [...keys, { key: index.split(": ")[0], page: page }] // Add the key and page to the keys array
        } else { // If it is a link
            keys = [...keys, { key: index.split(": ")[0], page: index.split(": ")[1] }] // Add the key and page to the keys array if it is a link already
        }
    }
    return keys; // Send the keys array back
}

bot.connect();