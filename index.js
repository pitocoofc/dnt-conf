const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ComponentType, MessageFlags,
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

module.exports = {
    name: "NDJ Control Center",
    description: "Controle de comandos de texto e status",
    init: (bot) => {
        bot.disabledCommands = bot.disabledCommands || new Set();
        bot.tempCommands = bot.tempCommands || new Map();
        const prefix = "!"; // Defina o prefixo para os comandos temporários aqui

        bot.command({
            name: 'admin',
            description: 'Painel Administrativo NDJ',
            run: async (ctx) => {
                if (ctx.interaction.user.id !== bot.config?.ownerId) {
                    return ctx.reply({ content: "❌ Acesso negado.", flags: [MessageFlags.Ephemeral] });
                }

                const renderPanel = () => {
                    const embed = new EmbedBuilder()
                        .setTitle('⚙️ NDJ Control | Gestão de Texto')
                        .setDescription(`Comandos de texto ativos: \`${bot.tempCommands.size}\``)
                        .addFields(
                            { name: '📡 Status', value: `\`${bot.client.user.presence.status}\``, inline: true },
                            { name: '⌨️ Prefixo', value: `\`${prefix}\``, inline: true }
                        )
                        .setColor('#2b2d31');

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('adm_temp_add').setLabel('Criar Texto').setStyle(ButtonStyle.Success).setEmoji('➕'),
                        new ButtonBuilder().setCustomId('adm_temp_del').setLabel('Apagar Texto').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                        new ButtonBuilder().setCustomId('adm_status').setLabel('Status').setStyle(ButtonStyle.Primary)
                    );

                    return { embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] };
                };

                const msg = await ctx.reply(renderPanel());
                const collector = msg.createMessageComponentCollector({ time: 300000 });

                collector.on('collect', async (i) => {
                    // --- MODAL PARA CRIAR ---
                    if (i.customId === 'adm_temp_add') {
                        const modal = new ModalBuilder().setCustomId('modal_add_txt').setTitle('Novo Comando de Texto');
                        const inputName = new TextInputBuilder().setCustomId('txt_name').setLabel("Gatilho (ex: regras)").setStyle(TextInputStyle.Short).setRequired(true);
                        const inputContent = new TextInputBuilder().setCustomId('txt_val').setLabel("Resposta do Bot").setStyle(TextInputStyle.Paragraph).setRequired(true);
                        
                        modal.addComponents(new ActionRowBuilder().addComponents(inputName), new ActionRowBuilder().addComponents(inputContent));
                        await i.showModal(modal);
                    }

                    // --- MODAL PARA APAGAR ---
                    if (i.customId === 'adm_temp_del') {
                        const modal = new ModalBuilder().setCustomId('modal_del_txt').setTitle('Apagar Comando de Texto');
                        const inputName = new TextInputBuilder().setCustomId('txt_del_name').setLabel("Nome do comando para apagar").setStyle(TextInputStyle.Short).setRequired(true);
                        
                        modal.addComponents(new ActionRowBuilder().addComponents(inputName));
                        await i.showModal(modal);
                    }

                    // --- MUDAR STATUS ---
                    if (i.customId === 'adm_status') {
                        const states = ['online', 'idle', 'dnd'];
                        const next = states[(states.indexOf(i.client.user.presence.status) + 1) % states.length];
                        i.client.user.setPresence({ status: next });
                        await i.update(renderPanel());
                    }
                });
            }
        });

        // --- OUVINTE DE INTERAÇÕES (MODALS) E MENSAGENS ---
        bot.client.on('interactionCreate', async (inter) => {
            if (!inter.isModalSubmit()) return;

            if (inter.customId === 'modal_add_txt') {
                const name = inter.fields.getTextInputValue('txt_name').toLowerCase().replace(/\s/g, '');
                const content = inter.fields.getTextInputValue('txt_val');
                bot.tempCommands.set(name, content);
                await inter.reply({ content: `✅ Comando \`${prefix}${name}\` criado!`, flags: [MessageFlags.Ephemeral] });
            }

            if (inter.customId === 'modal_del_txt') {
                const name = inter.fields.getTextInputValue('txt_del_name').toLowerCase().replace(/\s/g, '');
                if (bot.tempCommands.has(name)) {
                    bot.tempCommands.delete(name);
                    await inter.reply({ content: `🗑️ Comando \`${prefix}${name}\` removido.`, flags: [MessageFlags.Ephemeral] });
                } else {
                    await inter.reply({ content: `❌ O comando \`${prefix}${name}\` não foi encontrado.`, flags: [MessageFlags.Ephemeral] });
                }
            }
        });

        // --- OUVINTE DE MENSAGENS PARA OS COMANDOS DE TEXTO ---
        bot.client.on('messageCreate', async (message) => {
            if (message.author.bot || !message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const response = bot.tempCommands.get(commandName);
            if (response) {
                await message.reply(response);
            }
        });
    }
};
                
