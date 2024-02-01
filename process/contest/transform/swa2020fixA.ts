import * as csv2json from 'csvtojson';
import * as XLSX from 'xlsx';
import {dump, kill, error} from '../../vendor/printit (use throwlog instead)';
import {domainToASCII} from 'url';
import {getEnabledCategories} from 'trace_events';

let collectionMetadata;
collectionMetadata = '{"medal_page":false,"swa_round_2":false,"tastingType":"swa20"}';
collectionMetadata = '{"medal_page":true,"swa_round_2":true,"tastingType":"swa20"}';

var a = {type: {}, color: {}, colors: [], flightcode: [], price: []};

(async () => {
	let importFile;

	importFile = './sampleData.xlsx';
	importFile = './teamexport.csv';
	importFile = './old_SWA_2020_Final_data_MMF.csv';
	importFile = './SWA_2020_Final_data_19.02.csv';
	importFile = './Round2full.csv';
	importFile = './MissingData.csv';

	//var csv = "a,b,c\n1\n2,3\n,4"
	//var wb = XLSX.read(csv, {type:"binary"});
	//var wb = XLSX.readFile(__dirname + '/sampleData.xlsx');
	//var wines = XLSX.utils.sheet_to_json(wb.Sheets.Sheet1, {raw: true});

	let wines = await csv2json().fromFile(__dirname + '/' + importFile);

	wines = getData();

	let output = {};

	const re = {us2euDate: /(\d\d)\/(\d\d)\/(\d{4})/};

	wines = wines.map((el: any) => {
		el.Team = 'Team 2';
		el.teamName = el.Team.split(',').pop().trim();

		let flight = '[GRE-W] Greece white';

		el.eventName = `${flight}`;

		let startDate = '2020-03-09 01:01:00';

		let endDate = '2020-03-09 23:01:00';

		output[el.eventName] = output[el.eventName] || {
			meta: {
				team: el.teamName || kill(el, 'team'),
				category: flight || el.CompetitionCategoryName || kill(el, 'cocana'),
				flight: flight,
				metadata: collectionMetadata,
				start_date: startDate,

				end_date: endDate,
			},
			wines: [],
		};

		if (startDate < output[el.eventName].meta.start_date)
			output[el.eventName].meta.start_date = startDate;

		if (output[el.eventName].meta.end_date < endDate) output[el.eventName].meta.end_date = endDate;

		output[el.eventName].wines.push({
			country: 'Greece' || el.CountryName || kill(el, 'cname'),
			name: el['Flight code'] || kill(el, 'fcode'),
			region: el.Region || '',
			vintage: el.Vintage || kill(el, 'cintage'),
			price: +el.Price.replace(/[^\d\.]/, '') || kill(el, 'price'),
			currency: 'GBP',
			notes: getNotes(el),
		});
	});

	console.log(JSON.stringify(output, null, 4));
	dump(a);

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

	el.WineType = 'still';

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
			a.type[el.WineType] = a.type[el.WineType] || 1;
			a.type[el.WineType]++;

		//kill(`el.WineType: ` + el.WineType);
	}

	el.WineColour = 'white';

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
			a.color[el.WineColour] = a.color[el.WineColour] || 1;
			a.color[el.WineColour]++;
			a.colors.push(el.WineNodeID);
			dump(el);
		//kill(`el.WineColour: ` + el.WineColour);
	}

	return {
		'@': notes,
	};
}

function getData() {
	return [
		{
			Producer: 'Athanasiou',
			'Wine name': 'Assyrtiko Organic',
			Vintage: 2018,
			Region: 'Nemea',
			Country: 'Greece',
			Price: '£10.24',
			'Ex-Cellars': '0 EUR',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_003A',
			'Flighting information': 'flight code missing submitted on 12.02 MMF',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Jascots Wine Merchants Ltd.',
			'Submitter Email': 'info@sommelierwineawards.com',
			'Submitter Name': '',
			'Submitter Telephone': '020 8965 2000',
			'Submitter Website': 'https://www.jascots.co.uk/',
			'UK suppliers': 'Jascots Wine Merchants;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information':
				'10/02 Uploaded manually; KW:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': 'flight code missing submitted on 12.02 MMF',
		},
		{
			Producer: 'Domaine Papagiannakos',
			'Wine name': 'Papagiannakos Assyrtiko',
			Vintage: 2019,
			Region: 'Attika',
			Country: 'Greece',
			Price: '£10.75',
			'Ex-Cellars': '10.75 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_005',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Boutinot Ltd',
			'Submitter Email': 'georginab@boutinot.com',
			'Submitter Name': 'Georgina Bickers',
			'Submitter Telephone': '0161 908 1345',
			'Submitter Website': 'http://www.boutinot.com',
			'UK suppliers': '',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': 'Looks ok.  MB  04/02/20:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Domaine Papagiannakos',
			'Wine name': 'Papagiannakos Natural Savatiano',
			Vintage: 2019,
			Region: 'Attika',
			Country: 'Greece',
			Price: '£12.15',
			'Ex-Cellars': '12.15 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_008',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Boutinot Ltd',
			'Submitter Email': 'georginab@boutinot.com',
			'Submitter Name': 'Georgina Bickers',
			'Submitter Telephone': '0161 908 1345',
			'Submitter Website': 'http://www.boutinot.com',
			'UK suppliers': '',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': 'Looks ok.  MB  04/02/20:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Domaine Papagiannakos',
			'Wine name': 'Papagiannakos Savatiano',
			Vintage: 2019,
			Region: 'Attika',
			Country: 'Greece',
			Price: '£9.30',
			'Ex-Cellars': '9.3 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_001',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Boutinot Ltd',
			'Submitter Email': 'georginab@boutinot.com',
			'Submitter Name': 'Georgina Bickers',
			'Submitter Telephone': '0161 908 1345',
			'Submitter Website': 'http://www.boutinot.com',
			'UK suppliers': '',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': 'Looks ok.  MB  04/02/20:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Afianes',
			'Wine name': 'Litani',
			Vintage: 2018,
			Region: 'Aegean Islands',
			Country: 'Greece',
			Price: '£14.55',
			'Ex-Cellars': '0 EUR',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_012',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Southern Wine Roads',
			'Submitter Email': 'mmoutsou@southernwineroads.com',
			'Submitter Name': 'Maria Moutsou',
			'Submitter Telephone': '07775 714595',
			'Submitter Website': 'http://www.southernwineroads.com',
			'UK suppliers': 'Southern Wine Roads;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': 'Looks ok.  MB  30/01/20:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'EVANGELOS TSANTALIS',
			'Wine name': 'Santo Santorini Assyrtiko',
			Vintage: 2018,
			Region: 'SANTORINI',
			Country: 'Greece',
			Price: '£16.14',
			'Ex-Cellars': '16.14 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_014',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Bibendum Wine',
			'Submitter Email': 'vvickerman@bibendum-plb.com',
			'Submitter Name': 'Victoria Vickerman',
			'Submitter Telephone': '07885709315',
			'Submitter Website': '',
			'UK suppliers': 'Bibendum ;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': 'Looks ok.  MB  03/02/20:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Ktima Gerovassiliou',
			'Wine name': 'Malagousia, Epanomi, Ktima Gerovassiliou',
			Vintage: 2019,
			Region: 'Macedonia',
			Country: 'Greece',
			Price: '£14.36',
			'Ex-Cellars': '14.36 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_011',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Hallgarten Druitt & Novum Wines',
			'Submitter Email': 'Georgina.Smillie@hnwines.co.uk',
			'Submitter Name': 'Georgina Smillie',
			'Submitter Telephone': '01582 406336',
			'Submitter Website': 'http://www.hnwines.co.uk',
			'UK suppliers': 'Hallgarten & Novum Wines;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': '30/01 Looks fine; KW:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Ktima Biblia Chora',
			'Wine name': 'Sauvignon Blanc Assyrtiko Estate White, Pangeon, Ktima Biblia Chora',
			Vintage: 2019,
			Region: 'Macedonia',
			Country: 'Greece',
			Price: '£16.28',
			'Ex-Cellars': '16.28 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_015',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Hallgarten Druitt & Novum Wines',
			'Submitter Email': 'Georgina.Smillie@hnwines.co.uk',
			'Submitter Name': 'Georgina Smillie',
			'Submitter Telephone': '01582 406336',
			'Submitter Website': 'http://www.hnwines.co.uk',
			'UK suppliers': 'Hallgarten & Novum Wines;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': '30/01 Looks fine; KW:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Idaia Winery',
			'Wine name': 'Vidiano, Dafnes. Crete, Idaia Winery',
			Vintage: 2018,
			Region: 'Crete',
			Country: 'Greece',
			Price: '£12.54',
			'Ex-Cellars': '12.54 GBP',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_010',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Hallgarten Druitt & Novum Wines',
			'Submitter Email': 'Georgina.Smillie@hnwines.co.uk',
			'Submitter Name': 'Georgina Smillie',
			'Submitter Telephone': '01582 406336',
			'Submitter Website': 'http://www.hnwines.co.uk',
			'UK suppliers': 'Hallgarten & Novum Wines;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': '30/01 Looks fine; KW:Auto updated. Status Medal/In 05/03/2020',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': 'False',
			'Error notes': '',
		},
		{
			Producer: 'Alpha Estate',
			'Wine name': 'Alpha Estate Ecosystem Assyrtiko Single Block Aghia Kiriaki',
			Vintage: 2018,
			Region: 'Florina',
			Country: 'Greece',
			Price: '£15.11',
			'Ex-Cellars': '0 EUR',
			'Bottle size': '',
			'Residual sugar': '',
			'Competition category': 'Greece - white varietals/blends',
			'Flight code': '2020_GRE-W_013',
			'Flighting information': '',
			'Received status': 4,
			'Medal status': 'In',
			'Extra awards': '',
			'Tasting notes': '',
			Judges: '',
			'Submitter Company Name': 'Alpha Estate',
			'Submitter Email': 'export@alpha-estate.com',
			'Submitter Name': 'Konstantinos Arvanitakis',
			'Submitter Telephone': '00302386020111',
			'Submitter Website': 'http://www.alpha-estate.com',
			'UK suppliers': 'Hallgarten & Novum Wines;Maltby & Greek;',
			'Old world country': 'Greece',
			'Wine colour': 'White',
			Sweetness: '',
			'Additional information': '',
			'Bottle Size': '',
			'Residual sugar__1': '',
			'In error': '',
			'Error notes': '',
		},
	];
}
