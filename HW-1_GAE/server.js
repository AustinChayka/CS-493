const express = require('express');
const handlebars  = require('express-handlebars');

const app = express();

app.engine('handlebars', handlebars.engine({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({
    extended: true 
}));

const zodiacs = [
    ['Aries', {goblinType: 'Baby Goblin', goblinImage: 'baby.jpg'}],
    ['Taurus', {goblinType: 'Gentle Giant Goblin', goblinImage: 'giant.jpg'}], 
    ['Gemini', {goblinType: 'Mystic Cave Goblin', goblinImage: 'mystic.jpg'}], 
    ['Cancer', {goblinType: 'Banking Goblin', goblinImage: 'banker.jpg'}], 
    ['Leo', {goblinType: 'Green Goblin', goblinImage: 'green.jpg'}], 
    ['Virgo', {goblinType: 'Stinky Bog Goblin', goblinImage: 'stinky.jpg'}], 
    ['Libra', {goblinType: 'Vacation Goblin', goblinImage: 'vacation.png'}], 
    ['Scorpius', {goblinType: 'Cat Goblin', goblinImage: 'cat.png'}], 
    ['Sagittarius', {goblinType: 'Smelly Forest Goblin', goblinImage: 'smelly.jpg'}], 
    ['Capricornus', {goblinType: 'Retro Goblin', goblinImage: 'retro.jpg'}], 
    ['Aquarius', {goblinType: 'River Goblin', goblinImage: 'water.jpg'}], 
    ['Pices', {goblinType: 'Fancy Goblin', goblinImage: 'fancy.jpg'}]
];
const signs = zodiacs.map((x) => x[0]);
const results = zodiacs.map((x) => x[1]);

app.get('/', (req, res) => {
    res.render('selectSign', {zodiacs: signs});
});

app.post('/goblin_result', (req, res) => {
    var result = req.body.sign;
    var data = results[signs.indexOf(result)];
    res.render('goblinResult', {data: data});
});

app.get('/*', (req, res) => {
    res.send('404 Page not found!');
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});