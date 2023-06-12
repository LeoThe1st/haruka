const {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    Client,
} = require('discord.js');

const EmbedGenerator = require('../../Functions/embedGenerator');
const { loadCommands } = require('../../Handlers/commandHandler');
const { loadEvents } = require('../../Handlers/eventHandler');

module.exports = {
    developer: true,
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload your commands/events')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((options) => options.setName('events').setDescription('Reload your events.'))
        .addSubcommand((options) =>
            options.setName('commands').setDescription('Reload your commands.')
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    async execute(interaction, client) {
        const subCommand = interaction.options.getSubcommand();

        switch (subCommand) {
            case 'events': {
                client.removeAllListeners();
                await loadEvents(client);

                return { embeds: [EmbedGenerator.basicEmbed('Reloaded events.')], ephemeral: true };
            }
            case 'commands': {
                await loadCommands(client);

                return {
                    embeds: [EmbedGenerator.basicEmbed('Reloaded commands.')],
                    ephemeral: true,
                };
            }
        }
    },
};
