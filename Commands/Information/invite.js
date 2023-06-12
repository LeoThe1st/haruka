const { SlashCommandBuilder, ChatInputCommandInteraction, Client } = require('discord.js');

const EmbedGenerator = require('../../Functions/embedGenerator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDMPermission(false)
        .setDescription('Sends an invite of the bot to the user'),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    execute(interaction, client) {
        return EmbedGenerator.basicEmbed(
            `Closed.`
        );
    },
};
