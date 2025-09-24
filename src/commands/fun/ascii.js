const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'ascii',
  aliases: ['textart', 'art'],
  description: 'Convert text to ASCII art!',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (args.length === 0) {
      return sendReply('🎨 Please provide text to convert to ASCII art!\nUsage: `+ascii [text]`');
    }

    const inputText = args.join(' ').toUpperCase();
    
    // Simple ASCII art patterns
    const patterns = {
      'A': ['  A  ', ' A A ', 'AAAAA', 'A   A', 'A   A'],
      'B': ['BBBB ', 'B   B', 'BBBB ', 'B   B', 'BBBB '],
      'C': [' CCCC', 'C    ', 'C    ', 'C    ', ' CCCC'],
      'D': ['DDDD ', 'D   D', 'D   D', 'D   D', 'DDDD '],
      'E': ['EEEEE', 'E    ', 'EEEE ', 'E    ', 'EEEEE'],
      'F': ['FFFFF', 'F    ', 'FFFF ', 'F    ', 'F    '],
      'G': [' GGGG', 'G    ', 'G  GG', 'G   G', ' GGGG'],
      'H': ['H   H', 'H   H', 'HHHHH', 'H   H', 'H   H'],
      'I': [' IIII', '  I  ', '  I  ', '  I  ', ' IIII'],
      'J': ['    J', '    J', '    J', 'J   J', ' JJJ '],
      'K': ['K   K', 'K  K ', 'KKK  ', 'K  K ', 'K   K'],
      'L': ['L    ', 'L    ', 'L    ', 'L    ', 'LLLLL'],
      'M': ['M   M', 'MM MM', 'M M M', 'M   M', 'M   M'],
      'N': ['N   N', 'NN  N', 'N N N', 'N  NN', 'N   N'],
      'O': [' OOO ', 'O   O', 'O   O', 'O   O', ' OOO '],
      'P': ['PPPP ', 'P   P', 'PPPP ', 'P    ', 'P    '],
      'Q': [' QQQ ', 'Q   Q', 'Q   Q', 'Q  Q ', ' QQ Q'],
      'R': ['RRRR ', 'R   R', 'RRRR ', 'R  R ', 'R   R'],
      'S': [' SSSS', 'S    ', ' SSSS', '    S', 'SSSS '],
      'T': ['TTTTT', '  T  ', '  T  ', '  T  ', '  T  '],
      'U': ['U   U', 'U   U', 'U   U', 'U   U', ' UUU '],
      'V': ['V   V', 'V   V', 'V   V', ' V V ', '  V  '],
      'W': ['W   W', 'W   W', 'W W W', 'WW WW', 'W   W'],
      'X': ['X   X', ' X X ', '  X  ', ' X X ', 'X   X'],
      'Y': ['Y   Y', ' Y Y ', '  Y  ', '  Y  ', '  Y  '],
      'Z': ['ZZZZZ', '   Z ', '  Z  ', ' Z   ', 'ZZZZZ'],
      ' ': ['     ', '     ', '     ', '     ', '     '],
      '!': ['  !  ', '  !  ', '  !  ', '     ', '  !  '],
      '?': [' ??? ', '?   ?', '  ?  ', '     ', '  ?  '],
      '.': ['     ', '     ', '     ', '     ', '  .  '],
      ',': ['     ', '     ', '     ', '  ,  ', ' ,   '],
      '0': [' 000 ', '0   0', '0   0', '0   0', ' 000 '],
      '1': ['  1  ', ' 11  ', '  1  ', '  1  ', ' 111 '],
      '2': [' 222 ', '2   2', '  2  ', ' 2   ', '22222'],
      '3': [' 333 ', '3   3', '  33 ', '3   3', ' 333 '],
      '4': ['4   4', '4   4', '44444', '    4', '    4'],
      '5': ['55555', '5    ', '5555 ', '    5', '5555 '],
      '6': [' 666 ', '6    ', '6666 ', '6   6', ' 666 '],
      '7': ['77777', '   7 ', '  7  ', ' 7   ', '7    '],
      '8': [' 888 ', '8   8', ' 888 ', '8   8', ' 888 '],
      '9': [' 999 ', '9   9', ' 9999', '    9', ' 999 ']
    };

    // Convert text to ASCII art
    const lines = ['', '', '', '', ''];
    
    for (const char of inputText) {
      const pattern = patterns[char] || patterns['?'];
      for (let i = 0; i < 5; i++) {
        lines[i] += pattern[i] + ' ';
      }
    }

    const asciiArt = lines.join('\n');
    
    const responseText = new TextDisplayBuilder().setContent(
      `🎨 **ASCII Art**\n\n` +
      `\`\`\`\n${asciiArt}\n\`\`\`\n` +
      `**Text:** ${inputText}\n` +
      `**Created by:** <@${message.author.id}>`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 