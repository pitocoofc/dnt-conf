const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ComponentType, MessageFlags, StringSelectMenuBuilder, PermissionFlagsBits 
} = require('discord.js');

module.exports = {
    name: "NDJ Control Center",
    description: "Painel administrativo com gestão de comandos",
    init: (bot) => {
        // Criamos um Set global no bot para comandos desativados (se não existir)
        bot.disabledCommands = bot.disabledCommands || new Set();

        bot.command({
            name: 'admin',
            description: 'Abre o Painel de Controle Administrativo',
            run: async (ctx) => {
                // Filtro de Segurança Corrigido
                const isOwner = ctx.interaction.user.id === bot.config?.ownerId;
                const isAdmin = ctx.interaction.member.permissions.has(PermissionFlagsBits.Administrator);

                if (!isOwner && !isAdmin) {
                    return ctx.reply({ content: "❌ Acesso restrito.", flags: [MessageFlags.Ephemeral] });
                }

                const renderPanel = () => {
                    const embed = new EmbedBuilder()
                        .setTitle('⚙️ NDJ-Lib | Painel de Controle')
                        .setDescription('Gerencie os módulos e status do bot em tempo real.')
                        .addFields(
                            { name: 'Comandos Desativados', value: `${bot.disabledCommands.size}`, inline: true },
                            { name: 'Total de Comandos', value: `${bot.commands?.size || 0}`, inline: true }
                        )
                        .setColor('#5865F2');

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('btn_status').setLabel('Status').setStyle(ButtonStyle.Primary).setEmoji('🌙'),
                        new ButtonBuilder().setCustomId('btn_manage_cmds').setLabel('Ativar/Desativar Cmds').setStyle(ButtonStyle.Danger).setEmoji('🚫')
                    );

                    return { embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] };
                };

                const response = await ctx.reply(renderPanel());
                const collector = response.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async (i) => {
                    if (i.customId === 'btn_status') {
                        const states = ['online', 'idle', 'dnd'];
                        const current = i.client.user.presence.status;
                        const next = states[(states.indexOf(current) + 1) % states.length];
                        i.client.user.setPresence({ status: next });
                        await i.update(renderPanel());
                    }

                    if (i.customId === 'btn_manage_cmds') {
                        // Pegamos a lista de comandos registrados na lib
                        const options = Array.from(bot.commands.values()).map(cmd => ({
                            label: cmd.name,
                            description: bot.disabledCommands.has(cmd.name) ? "Atualmente: DESATIVADO" : "Atualmente: ATIVO",
                            value: cmd.name,
                            emoji: bot.disabledCommands.has(cmd.name) ? '❌' : '✅'
                        }));

                        const menu = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('menu_cmds')
                                .setPlaceholder('Selecione um comando para alternar o status')
                                .addOptions(options.slice(0, 25)) // Limite do Discord
                        );

                        await i.reply({ content: "Escolha um comando para ligar/desligar:", components: [menu], flags: [MessageFlags.Ephemeral] });
                    }

                    if (i.customId === 'menu_cmds') {
                        const cmdName = i.values[0];
                        if (bot.disabledCommands.has(cmdName)) {
                            bot.disabledCommands.delete(cmdName);
                            await i.update({ content: `✅ Comando \`${cmdName}\` foi ATIVADO.`, components: [], flags: [MessageFlags.Ephemeral] });
                        } else {
                            bot.disabledCommands.add(cmdName);
                            await i.update({ content: `🚫 Comando \`${cmdName}\` foi DESATIVADO.`, components: [], flags: [MessageFlags.Ephemeral] });
                        }
                    }
                });
            }
        });

        // IMPORTANTE: Precisamos injetar a trava no executor de comandos da lib
        // Isso deve ser feito na parte onde o comando é disparado.
        // Se a sua lib tiver um "bot.onInteraction", adicione:
        // if (bot.disabledCommands.has(interaction.commandName)) return interaction.reply("Este comando está desativado.");
    }
};
                        new ButtonBuilder().setCustomId('adm_cmds').setLabel('Gerenciar Cmds').setStyle(ButtonStyle.Secondary).setEmoji('🚫'),
                        new ButtonBuilder().setCustomId('adm_temp').setLabel('Msg Temporária').setStyle(ButtonStyle.Success).setEmoji('➕')
                    );

                    return { embeds: [embed], components: [row1], flags: [MessageFlags.Ephemeral] };
                };

                const msg = await ctx.reply(renderPanel());
                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

                collector.on('collect', async (i) => {
                    if (i.customId === 'adm_status') {
                        // Exemplo: Ciclo de status (Online -> Idle -> DND)
                        const states = ['online', 'idle', 'dnd'];
                        const current = states.indexOf(bot.client.user.presence.status) || 0;
                        const next = states[(current + 1) % states.length];
                        
                        bot.client.user.setPresence({ status: next });
                        await i.update(renderPanel());
                    }

                    if (i.customId === 'adm_cmds') {
                        await i.reply({ content: "Selecione o comando para desativar (Menu em desenvolvimento).", flags: [MessageFlags.Ephemeral] });
                    }

                    if (i.customId === 'adm_temp') {
                        await i.reply({ content: "Função de injeção de mensagem temporária pendente.", flags: [MessageFlags.Ephemeral] });
                    }
                });
            }
        });

        console.log("🎮 [Módulo] NDJ Control Center carregado!");
    }
};
