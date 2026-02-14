const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ComponentType, MessageFlags,
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

module.exports = {
    name: "NDJ Control Center",
    description: "Painel administrativo para controle total do bot",
    init: (bot) => {
        bot.disabledCommands = bot.disabledCommands || new Set();
        bot.tempCommands = bot.tempCommands || new Map();

        bot.command({
            name: 'admin',
            description: 'Abre o Painel de Controle Administrativo',
            run: async (ctx) => {
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
                            { name: 'Status', value: `\`${bot.client.user.presence.status.toUpperCase()}\``, inline: true },
                            { name: 'Cmds Desativados', value: `\`${bot.disabledCommands.size}\``, inline: true },
                            { name: 'Mensagens Ativas', value: `\`${bot.tempCommands.size}\``, inline: true }
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
                        const current = states.indexOf(bot.client.user.presence.status) || 0;
                        const next = states[(current + 1) % states.length];
                        bot.client.user.setPresence({ status: next });
                        await i.update(renderPanel());
                    }

                    // --- GERENCIAR COMANDOS (Select Menu) ---
                    if (i.customId === 'adm_cmds') {
                        const options = Array.from(bot.commands.values()).slice(0, 25).map(cmd => ({
                            label: cmd.name,
                            value: cmd.name,
                            emoji: bot.disabledCommands.has(cmd.name) ? '❌' : '✅'
                        }));

                        const menuRow = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('select_disable')
                                .setPlaceholder('Selecione para alternar ON/OFF')
                                .addOptions(options)
                        );

                        await i.reply({ content: "Selecione o comando para mudar o estado:", components: [menuRow], flags: [MessageFlags.Ephemeral] });
                    }

                    // --- MENSAGEM TEMPORÁRIA (Modal) ---
                    if (i.customId === 'adm_temp') {
                        const modal = new ModalBuilder()
                            .setCustomId('modal_temp_cmd')
                            .setTitle('Criar Comando de Resposta');

                        const nameInput = new TextInputBuilder()
                            .setCustomId('temp_name')
                            .setLabel("Nome do comando (sem /)")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);

                        const responseInput = new TextInputBuilder()
                            .setCustomId('temp_text')
                            .setLabel("O que o bot deve responder?")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true);

                        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(responseInput));
                        await i.showModal(modal);
                    }
                    
                    // Lógica do Select Menu de Comandos
                    if (i.customId === 'select_disable') {
                        const name = i.values[0];
                        if (bot.disabledCommands.has(name)) bot.disabledCommands.delete(name);
                        else bot.disabledCommands.add(name);
                        
                        await i.update({ content: `Estado de \`${name}\` alterado!`, components: [] });
                    }
                });
            }
        });

        // Lógica Global para os Modals e Interceptação
        bot.client.on('interactionCreate', async (inter) => {
            // Salvar Comando Temporário
            if (inter.isModalSubmit() && inter.customId === 'modal_temp_cmd') {
                const name = inter.fields.getTextInputValue('temp_name');
                const text = inter.fields.getTextInputValue('temp_text');
                bot.tempCommands.set(name, text);
                await inter.reply({ content: `✅ Comando temporário \`/${name}\` criado!`, flags: [MessageFlags.Ephemeral] });
            }

            // Responder Comando Temporário (Se alguém digitar algo que combine)
            if (inter.isChatInputCommand()) {
                const response = bot.tempCommands.get(inter.commandName);
                if (response) {
                    return inter.reply({ content: response });
                }
            }
        });

        console.log("🎮 [Módulo] NDJ Control Center carregado!");
    }
};
