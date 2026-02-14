const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ComponentType, MessageFlags 
} = require('discord.js');

module.exports = {
    name: "NDJ Control Center",
    description: "Painel administrativo para controle total do bot",
    init: (bot) => {
        // Armazenamento temporário de comandos desativados
        bot.disabledCommands = bot.disabledCommands || new Set();

        bot.command({
            name: 'admin',
            description: 'Abre o Painel de Controle Administrativo',
            run: async (ctx) => {
                // Verificação de segurança (Apenas o dono/admin)
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
                            { name: 'Status do Bot', value: bot.client.user.presence.status.toUpperCase(), inline: true },
                            { name: 'Comandos Ativos', value: `${bot.commands?.size || 0}`, inline: true }
                        )
                        .setColor('#2b2d31');

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('adm_status').setLabel('Mudar Status').setStyle(ButtonStyle.Primary).setEmoji('🌙'),
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
