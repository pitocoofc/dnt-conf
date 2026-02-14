const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ComponentType, MessageFlags,
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

module.exports = {
    name: "NDJ Control Center",
    description: "Painel administrativo estável para Termux",
    init: (bot) => {
        // Inicializa os armazenamentos se não existirem
        bot.disabledCommands = bot.disabledCommands || new Set();
        bot.tempCommands = bot.tempCommands || new Map();

        bot.command({
            name: 'admin',
            description: 'Abre o Painel de Controle Administrativo',
            run: async (ctx) => {
                // Filtro de Segurança (Dono do Bot)
                if (ctx.interaction.user.id !== bot.config?.ownerId) {
                    return ctx.reply({ 
                        content: "❌ Acesso restrito ao desenvolvedor oficial.", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                const renderPanel = () => {
                    const embed = new EmbedBuilder()
                        .setTitle('⚙️ NDJ-Lib | Control Center')
                        .setDescription('Gerencie as funções do bot em tempo real.')
                        .addFields(
                            { name: '📡 Status', value: `\`${bot.client.user.presence.status.toUpperCase()}\``, inline: true },
                            { name: '🚫 Cmds Off', value: `\`${bot.disabledCommands.size}\``, inline: true },
                            { name: '✉️ Msgs Temp', value: `\`${bot.tempCommands.size}\``, inline: true }
                        )
                        .setColor('#2b2d31');

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('adm_status').setLabel('Status').setStyle(ButtonStyle.Primary).setEmoji('🌙'),
                        new ButtonBuilder().setCustomId('adm_cmds').setLabel('Desativar').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
                        new ButtonBuilder().setCustomId('adm_temp').setLabel('Msg Temporária').setStyle(ButtonStyle.Success).setEmoji('➕')
                    );

                    return { embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] };
                };

                const msg = await ctx.reply(renderPanel());
                const collector = msg.createMessageComponentCollector({ time: 300000 });

                collector.on('collect', async (i) => {
                    // --- MUDAR STATUS ---
                    if (i.customId === 'adm_status') {
                        const states = ['online', 'idle', 'dnd'];
                        const current = i.client.user.presence.status;
                        const next = states[(states.indexOf(current) + 1) % states.length];
                        i.client.user.setPresence({ status: next });
                        await i.update(renderPanel());
                    }

                    // --- GERENCIAR COMANDOS (Com filtro de erro) ---
                    if (i.customId === 'adm_cmds') {
                        // O filtro abaixo evita o erro de "Expected String Primitive"
                        const options = Array.from(bot.commands.values())
                            .filter(cmd => cmd && (cmd.name || cmd.data?.name)) 
                            .slice(0, 25)
                            .map(cmd => {
                                const cmdName = cmd.name || cmd.data.name;
                                return {
                                    label: String(cmdName),
                                    value: String(cmdName),
                                    description: bot.disabledCommands.has(cmdName) ? "Atualmente: DESATIVADO" : "Atualmente: ATIVO",
                                    emoji: bot.disabledCommands.has(cmdName) ? '❌' : '✅'
                                };
                            });

                        if (options.length === 0) {
                            return i.reply({ content: "⚠️ Nenhum comando encontrado.", flags: [MessageFlags.Ephemeral] });
                        }

                        const menuRow = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('select_disable')
                                .setPlaceholder('Selecione um comando para alternar')
                                .addOptions(options)
                        );

                        await i.reply({ content: "Escolha o comando para mudar o estado:", components: [menuRow], flags: [MessageFlags.Ephemeral] });
                    }

                    // --- MENSAGEM TEMPORÁRIA (Modal) ---
                    if (i.customId === 'adm_temp') {
                        const modal = new ModalBuilder()
                            .setCustomId('modal_temp_cmd')
                            .setTitle('Criar Resposta Rápida');

                        const nameInput = new TextInputBuilder()
                            .setCustomId('temp_name')
                            .setLabel("Nome do comando (Ex: aviso)")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);

                        const responseInput = new TextInputBuilder()
                            .setCustomId('temp_text')
                            .setLabel("Texto da resposta")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(nameInput), 
                            new ActionRowBuilder().addComponents(responseInput)
                        );
                        await i.showModal(modal);
                    }

                    // --- LÓGICA DO SELECT MENU ---
                    if (i.customId === 'select_disable') {
                        const name = i.values[0];
                        if (bot.disabledCommands.has(name)) {
                            bot.disabledCommands.delete(name);
                            await i.update({ content: `✅ Comando \`${name}\` ATIVADO.`, components: [] });
                        } else {
                            bot.disabledCommands.add(name);
                            await i.update({ content: `🚫 Comando \`${name}\` DESATIVADO.`, components: [] });
                        }
                    }
                });
            }
        });

        // Ouvinte global para Modals e Comandos Temporários
        bot.client.on('interactionCreate', async (inter) => {
            // Salvar via Modal
            if (inter.isModalSubmit() && inter.customId === 'modal_temp_cmd') {
                const name = inter.fields.getTextInputValue('temp_name').toLowerCase();
                const text = inter.fields.getTextInputValue('temp_text');
                bot.tempCommands.set(name, text);
                await inter.reply({ content: `✅ Comando temporário \`/${name}\` pronto para uso!`, flags: [MessageFlags.Ephemeral] });
            }

            // Responder Comando Temporário
            if (inter.isChatInputCommand()) {
                const response = bot.tempCommands.get(inter.commandName);
                if (response) {
                    return inter.reply({ content: response });
                }
            }
        });
    }
};
