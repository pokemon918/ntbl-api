import * as csv2json from 'csvtojson';
import * as XLSX from 'xlsx';
import {dump, kill, error} from '../../vendor/printit (use throwlog instead)';
import {domainToASCII} from 'url';
import {getEnabledCategories} from 'trace_events';

let collectionMetadata;
collectionMetadata = '{"medal_page":false,"swa_round_2":false,"tastingType":"swa20"}';
collectionMetadata = '{"medal_page":true,"swa_round_2":true,"tastingType":"swa20"}';

var issuesFound = {type: {}, color: {}, colors: [], flightcode: [], price: []};

(async () => {
	let importFile;

	importFile = './sampleData.xlsx';
	importFile = './teamexport.csv';
	importFile = './old_SWA_2020_Final_data_MMF.csv';
	importFile = './SWA_2020_Final_data_19.02.csv';

	let wines = await csv2json().fromFile(__dirname + '/' + importFile);

	let output = {};

	const re = {us2euDate: /(\d\d)\/(\d\d)\/(\d{4})/};

	wines = wines.map((el: any) => {
		el.teamName = el.Team.split(',').pop().trim();

		if (!['Team 1'].includes(el.teamName)) return;

		if (5 < Object.keys(output).length) return;

		el.eventName = `[${el.CompetitionCode}] ${el.CompetitionCategoryName} (${el.teamName})`;

		let startDate =
			new Date(el['Tasting Date'].replace(re.us2euDate, '$3-$2-$1T00:01:00.000Z')).toISOString() ||
			kill(el, 'start date');
		let endDate =
			new Date(el['Tasting Date'].replace(re.us2euDate, '$3-$2-$1T23:59:00.000Z')).toISOString() ||
			kill(el, 'end date');

		output[el.eventName] = output[el.eventName] || {
			meta: {
				team: el.teamName || kill(el, 'team'),
				category:
					`[${el.CompetitionCode}] ${el.CompetitionCategoryName}` ||
					el.CompetitionCategoryName ||
					kill(el, 'cocana'),
				flight: el.eventName || kill(el, 'evname'),
				metadata: collectionMetadata,
				start_date: '2020-01-02 00:01:00',

				end_date: '2020-07-02 00:01:00',
			},
			wines: [],
		};

		/*
		if (startDate < output[el.eventName].meta.start_date)
			output[el.eventName].meta.start_date = startDate;

		if (output[el.eventName].meta.end_date < endDate) output[el.eventName].meta.end_date = endDate;
		*/

		if (5 < output[el.eventName].wines.length) return;

		output[el.eventName].wines.push({
			country: el.CountryName || kill(el, 'cname'),
			name: el.flightcode || issuesFound.flightcode.push(el.WineNodeID) || kill(el, 'fcode'),
			region: el.appellation || '',
			vintage: el.vintage || kill(el, 'cintage'),
			price: +el.price || issuesFound.price.push(el.WineNodeID) || kill(el, 'price'),
			currency: 'GBP',
			notes: getNotes(el),
		});
	});

	console.log(JSON.stringify(output, null, 4));
	dump(issuesFound);

	/*
{
	"Round 1: Sauvignon Blanc - white - assorted countries (Team 1)": {
		"meta": {
			"round": "Round 1",
			"team": "Team 1",
			"category": "Sauvignon Blanc - white - assorted countries",
			"flight": "Round 1: Sauvignon Blanc - white - assorted countries (Team 1)",
			"metadata": "{\"medal_page\":false,\"swa_round_2\":false,\"tastingType\":\"swa20\"}"
		},
		"wines": [
			{
				"country": "South Africa",
				"name": "Wine 1 from South Africa",
				"region": "Western Cape",
				"vintage": 2018,
				"price": 7.2,
				"currency": "GBP",
				"notes": {
					"@": ["category_still", "nuance_white"]
				}
			},
			
			//*/
})();

function getNotes(el) {
	let notes = [];

	switch (el.WineType.toLowerCase()) {
		case 'sparkling':
			notes.push('category_sparkling');
			break;

		case 'sweet':
		case 'still':
			notes.push('category_still');
			break;

		case 'fortified':
			notes.push('category_fortified');
			break;

		/*case 'sweet':
		/*dump(
				{producer: el.producer, winename: el.winename, appellation: el.appellation},
				console.error
			);
			break;*/

		//case '':dump(el.flightcode, console.error);

		default:
			issuesFound.type[el.WineType] = issuesFound.type[el.WineType] || 1;
			issuesFound.type[el.WineType]++;

		//kill(`el.WineType: ` + el.WineType);
	}

	switch (el.WineColour.toLowerCase()) {
		case 'white':
			notes.push('nuance_white');
			break;

		case 'rosé':
			notes.push('nuance_rose');
			break;

		case 'red':
			notes.push('nuance_red');
			break;

		case '':
			if (el.WineType === 'Sweet') notes.push('nuance_white');
			if (el.WineType === 'Orange') notes.push('nuance_red');
			break;
		default:
			issuesFound.color[el.WineColour] = issuesFound.color[el.WineColour] || 1;
			issuesFound.color[el.WineColour]++;
			issuesFound.colors.push(el.WineNodeID);
			dump(el);
		//kill(`el.WineColour: ` + el.WineColour);
	}

	return {
		'@': notes,
	};
}
