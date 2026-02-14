const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ComponentType, MessageFlags, 
    StringSelectMenuBuilder, PermissionFlagsBits, Events 
} = require('discord.js');

module.exports = {
    name: "NDJ Control Center",
    description: "Painel administrativo com trava de segurança integrada",
    init: (bot) => {
        bot.disabledCommands = bot.disabledCommands || new Set();
        const client = bot.client || bot;

        // Corrigindo o Deprecation e a Trava de Comandos
        client.once(Events.ClientReady, () => {
            client.on(Events.InteractionCreate, async (interaction) => {
                if (!interaction.isChatInputCommand()) return;

                if (bot.disabledCommands.has(interaction.commandName)) {
                    // Impede a execução se estiver desativado
                    return interaction.reply({ 
                        content: "🚫 Este comando foi temporariamente desativado pelo administrador.", 
                        flags: [MessageFlags.Ephemeral] 
                    }).catch(() => null);
                }
            });
            console.log("🛡️ [Security] Trava de comandos ativa e monitorando.");
        });

        // Comando Admin (O mesmo que já funcionou para você)
        bot.command({
            name: 'admin',
            description: 'Painel de Controle',
            run: async (ctx) => {
                const isOwner = ctx.interaction.user.id === bot.config?.ownerId;
                const isAdmin = ctx.interaction.member.permissions.has(PermissionFlagsBits.Administrator);

                if (!isOwner && !isAdmin) {
                    return ctx.reply({ content: "❌ Acesso restrito.", flags: [MessageFlags.Ephemeral] });
                }

                const renderPanel = () => {
                    const embed = new EmbedBuilder()
                        .setTitle('⚙️ NDJ-Lib | Painel')
                        .setDescription(`Comandos desativados: **${bot.disabledCommands.size}**`)
                        .setColor('#5865F2');

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('btn_status').setLabel('Status').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('btn_manage_cmds').setLabel('Gerenciar Cmds').setStyle(ButtonStyle.Danger)
                    );

                    return { embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] };
                };

                const response = await ctx.reply(renderPanel());
                const collector = response.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async (i) => {
                    if (i.customId === 'btn_status') {
                        const states = ['online', 'idle', 'dnd'];
                        const next = states[(states.indexOf(client.user.presence.status) + 1) % states.length];
                        client.user.setPresence({ status: next });
                        await i.update(renderPanel());
                    }

                    if (i.customId === 'btn_manage_cmds') {
                        const options = Array.from(bot.commands.values()).map(cmd => ({
                            label: cmd.name,
                            value: cmd.name,
                            description: bot.disabledCommands.has(cmd.name) ? "Status: OFF" : "Status: ON",
                            emoji: bot.disabledCommands.has(cmd.name) ? '❌' : '✅'
                        }));

                        const menu = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('menu_cmds')
                                .setPlaceholder('Selecione para ligar/desligar')
                                .addOptions(options.slice(0, 25))
                        );

                        await i.reply({ content: "Selecione o comando:", components: [menu], flags: [MessageFlags.Ephemeral] });
                    }

                    if (i.customId === 'menu_cmds') {
                        const cmdName = i.values[0];
                        if (bot.disabledCommands.has(cmdName)) {
                            bot.disabledCommands.delete(cmdName);
                            await i.update({ content: `✅ Comando \`${cmdName}\` ATIVADO.`, components: [] });
                        } else {
                            bot.disabledCommands.add(cmdName);
                            await i.update({ content: `🚫 Comando \`${cmdName}\` DESATIVADO.`, components: [] });
                        }
                    }
                });
            }
        });
    }
};
