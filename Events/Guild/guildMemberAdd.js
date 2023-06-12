const Discord = require('discord.js');
const moment = require('moment');

const EmbedGenerator = require('../../Functions/embedGenerator');
const { GuildsManager } = require('../../Classes/GuildsManager');

/** @type {Record<string, Set<String>>} */ const antiRaidTracking = {};

module.exports = {
    name: 'guildMemberAdd',
    /**
     * @param {Discord.GuildMember} member
     * @param {Discord.Client} client
     */
    async execute(member, client) {
        const guild = await GuildsManager.fetch(member.guild.id);
        if (!guild) return;

        if (guild.antiraid.enabled) {
            if (!guild.antiraid.raid) {
                if (!antiRaidTracking[member.guild.id])
                    antiRaidTracking[member.guild.id] = new Set();
                antiRaidTracking[member.guild.id].add(member.id);

                if (antiRaidTracking[member.guild.id].size >= guild.antiraid.joinAmount) {
                    guild.document.antiraid.raid = true;
                    if (guild.antiraid.lockdown.enabled)
                        guild.document.antiraid.lockdown.active = true;

                    Guilds.findOneAndUpdate(
                        { guild: member.guild.id },
                        {
                            $set: {
                                'antiraid.raid': guild.antiraid.raid,
                                'antiraid.lockdown.active': guild.antiraid.lockdown.active,
                            },
                        }
                    ).then(async (guild) => {
                        if (!guild.antiraid.raid) {
                            if (guild.antiraid.channel) {
                                /** @type {Discord.TextChannel} */ const channel =
                                    await member.guild.channels.fetch(guild.antiraid.channel);
                                if (channel)
                                    channel.send({
                                        embeds: [
                                            EmbedGenerator.basicEmbed(
                                                `🔒 | Raid mode has been enabled!${
                                                    guild.antiraid.lockdown.enabled
                                                        ? '\n🔒 | This server has entered lockdown mode!'
                                                        : ''
                                                }`
                                            ),
                                        ],
                                    });
                            }

                            if (guild.antiraid.lockdown.enabled) {
                                // execute lockdown
                            }

                            if (guild.antiraid.action == 'kick') {
                                for (const id of antiRaidTracking[member.guild.id]) {
                                    member.guild.members
                                        .fetch(id)
                                        .then((m) => {
                                            m.send({
                                                embeds: [
                                                    EmbedGenerator.basicEmbed(
                                                        `You have been kicked from **${member.guild.name}**\nThis server is currently in raid mode, please try again later!`
                                                    ),
                                                ],
                                            })
                                                .finally(() => {
                                                    m.kick().catch(() => null);
                                                })
                                                .catch(() => null);
                                        })
                                        .catch((err) => null);
                                }
                            } else if (guild.antiraid.action == 'ban') {
                                for (const id of antiRaidTracking[member.guild.id]) {
                                    member.guild.members
                                        .fetch(id)
                                        .then((m) => {
                                            m.send({
                                                embeds: [
                                                    EmbedGenerator.basicEmbed(
                                                        `You have been banned from **${member.guild.name}**\nThis server is currently in raid mode, we apologize for the inconvenience!`
                                                    ),
                                                ],
                                            })
                                                .finally(() => {
                                                    m.ban().catch(() => null);
                                                })
                                                .catch(() => null);
                                        })
                                        .catch((err) => null);
                                }
                            }
                        }
                    });
                }

                setTimeout(
                    () => antiRaidTracking[member.guild.id].delete(member.id),
                    guild.antiraid.joinWithin * 1000
                );
            } else {
                if (guild.antiraid.action == 'kick') {
                    await member
                        .send({
                            embeds: [
                                EmbedGenerator.basicEmbed(
                                    `You have been kicked from **${member.guild.name}**\nThis server is currently in raid mode, please try again later!`
                                ),
                            ],
                        })
                        .catch(() => null);
                    member.kick().catch(() => null);
                } else if (guild.antiraid.action == 'ban') {
                    await member
                        .send({
                            embeds: [
                                EmbedGenerator.basicEmbed(
                                    `You have been banned from **${member.guild.name}**\nThis server is currently in raid mode, we apologize for the inconvenience!`
                                ),
                            ],
                        })
                        .catch(() => null);
                    member.ban().catch(() => null);
                }
            }
        }

        if (guild.verification.enabled) {
            const role = await member.guild.roles.fetch(guild.verification.role);
            if (role && role instanceof Discord.Role) member.roles.add(role).catch(() => null);
        }

        let assignedRole;
        if (guild.autorole.enabled) {
            const role = await member.guild.roles.fetch(
                member.user.bot ? guild.autorole.bot : guild.autorole.member
            );
            if (!role || !(role instanceof Discord.Role)) {
                assignedRole = 'Failed to fetch role.';
            } else {
                await member.roles
                    .add(role)
                    .then(() => {
                        assignedRole = role.id;
                    })
                    .catch(() => {
                        assignedRole = 'Failed due to higher role hierarchy.';
                    });
            }
        } else {
            assignedRole = 'Not configured.';
        }

        if (guild.logs.enabled) {
            const logChannel = await member.guild.channels.fetch(guild.logs.basic);
            if (!logChannel || !(logChannel instanceof Discord.TextChannel)) return;

            let color = '#74e21e';
            let risk = 'Fairly Safe';

            const accountCreation = parseInt(member.user.createdTimestamp / 1000);
            const joiningTime = parseInt(member.joinedAt / 1000);

            const monthsAgo = moment().subtract(2, 'months').unix();
            const weeksAgo = moment().subtract(2, 'weeks').unix();
            const daysAgo = moment().subtract(2, 'days').unix();

            if (accountCreation >= monthsAgo) {
                color = '#e2bb1e';
                risk = 'Medium';
            }

            if (accountCreation >= weeksAgo) {
                color = '#e24d1e';
                risk = 'High';
            }

            if (accountCreation >= daysAgo) {
                color = '#e21e11';
                risk = 'Extreme';
            }

            const response = {
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({
                            name: `${member.user.tag} | ${member.id}`,
                            iconURL: member.displayAvatarURL({ dynamic: true }),
                        })
                        .setColor(color)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setDescription(
                            [
                                `• User: ${member.user}`,
                                `• Account Type: ${member.user.bot ? 'Bot' : 'User'}`,
                                `• Role Assigned: <@&${assignedRole}>`,
                                `• Risk Level: ${risk}\n`,
                                `• Account Created: <t:${accountCreation}:D> | <t:${accountCreation}:R>`,
                                `• Account Joined: <t:${joiningTime}:D> | <t:${joiningTime}:R>`,
                            ].join('\n')
                        )
                        .setFooter({ text: 'Joined' })
                        .setTimestamp(),
                ],
            };

            if (risk == 'High' || risk == 'Extreme')
                response.components = [
                    new Discord.ActionRowBuilder().addComponents(
                        new Discord.ButtonBuilder()
                            .setCustomId(`MemberLogging-Kick-${member.id}`)
                            .setLabel('Kick')
                            .setStyle(Discord.ButtonStyle.Danger),
                        new Discord.ButtonBuilder()
                            .setCustomId(`MemberLogging-Ban-${member.id}`)
                            .setLabel('Ban')
                            .setStyle(Discord.ButtonStyle.Danger)
                    ),
                ];

            logChannel.send(response);
        }
    },
};
