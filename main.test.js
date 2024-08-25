const {main} = require("./experimental.js");
const {existsSync} = require("node:fs");

// jest.setTimeout(300000);
// test('Download test', async () => {
//     await main('https://www.9now.com.au/football-olympic-games-paris-2024/season-2024/episode-1', 'Football test');
//     expect(existsSync('output/Football test.mp4')).resolves.toBe(true);
// });

main('https://www.9now.com.au/football-olympic-games-paris-2024/season-2024/episode-1', 'Football test')
    .then(() => console.warn("Complete!"))