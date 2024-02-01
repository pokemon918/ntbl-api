import * as csv2json from 'csvtojson';
import * as XLSX from 'xlsx';
import {dump, kill, error} from '../../vendor/printit (use throwlog instead)';
import {domainToASCII} from 'url';
import {getEnabledCategories} from 'trace_events';

const collectionMetadataR1 = '{"medal_page":false,"swa_round_2":false,"tastingType":"swa20"}';
const collectionMetadataR2 = '{"medal_page":true,"swa_round_2":true,"tastingType":"swa20"}';
const collectionMetadataR3 = '{"medal_page":false,"swa_round_2":true,"tastingType":"swa20"}';

var a = {type: {}, color: {}, colors: [], flightcode: [], price: []};

const re = {us2euDate: /(\d\d)\/(\d\d)\/(\d{4})/};

var output = {};

(async () => {
	let importFile;

	importFile = './sampleData.xlsx';
	importFile = './teamexport.csv';
	importFile = './old_SWA_2020_Final_data_MMF.csv';
	importFile = './SWA_2020_Final_data_19.02.csv';
	importFile = './Round2full.csv';
	importFile = './SWA_2020_Final_data_19.02.csv';

	//var csv = "a,b,c\n1\n2,3\n,4"
	//var wb = XLSX.read(csv, {type:"binary"});
	//var wb = XLSX.readFile(__dirname + '/sampleData.xlsx');
	//var wines = XLSX.utils.sheet_to_json(wb.Sheets.Sheet1, {raw: true});

	let wines = await csv2json().fromFile(__dirname + '/' + importFile);

	let data = [];
	//prettier-ignore
	if(1){
			data.push({
				theme: 'Fine Wine of the Year',
				metadata: collectionMetadataR3,
				team: "Team 1",
				wines:`
				2020_FR-BY-R_012
				2020_FR-RHO-N-R_003
				2020_FR-RHO-W_005
				2020_GER-RIE-D_013
				2020_IT-CEN-W_019
				2020_IT-NW-BBO_003
				2020_NW-CAM-AUS-MGR_005
				2020_NW-CHY-SAF_006
				2020_NW-O-R_038
				2020_NW-PIN-US_008
				2020_NW-ZIN_005
				2020_SPN-RIO-W_010
			`.split("\n").map(line=>line.trim()).filter(Boolean)
			})

			



			data.push({
				theme: 'Gastro-pub Wine of the Year',
				metadata: collectionMetadataR3,
				team: "Team 1",
				wines:`
				2020_AUS-GV_001
				2020_FR-BY-BJL-CR_003
				2020_FR-LOI-R_002
				2020_FR-RHO-S-R_002
				2020_IT-SS-R-NA_004
				2020_NW-CB_009
				2020_NW-PIN-CHI-LEY_003
				2020_NW-SAV-CHI-LEY_006
				2020_OR_001
				2020_SPA-IT-P_011
				2020_SPA-IT_007
				2020_SPN-RIO-CR-R_003
				2020_SPN-R_021
			`.split("\n").map(line=>line.trim()).filter(Boolean)
			})


			data.push({
				theme: 'Overall Wine of the Year',
				metadata: collectionMetadataR3,
				team: "Team 1",
				wines:`
				2020_FR-BY-CHA-CR_002
2020_GRE-W_011
2020_IT-SS-W_014
2020_NW-CAM-SAF-ST_005
2020_NW-CB_015
2020_NW-GRE_004
2020_NW-O-R_038
2020_NW-PGR_014
2020_NW-ZIN_005
2020_SPA-SP-CAV_005
2020_SPN-NW-R_006
2020_UK-W_022
			`.split("\n").map(line=>line.trim()).filter(Boolean)
			})

			data.push({
				theme: 'House Wine of the Year',
				metadata: collectionMetadataR3,
				team: "Team 1",
				wines:`
				2020_HW-R_002
				2020_HW-R_033
				2020_HW-R_025
				2020_HW-R_067
				2020_HW-R_026
				2020_HW-R_040
				2020_HW-R_062
				2020_HW-RO_009
				2020_HW-RO_015
				2020_HW-W_032
				2020_HW-W_060
				2020_HW-W_021
				2020_HW-W_033
				2020_HW-W_065
			`.split("\n").map(line=>line.trim()).filter(Boolean)
			})


			data.push({
				theme: 'Food match',
				metadata: collectionMetadataR3,
				team: "Team 1",
				wines:`
				2020_AUS-GV_001
2020_FR-BY-CHA_001
2020_FR-LOI-CHE_001
2020_FR-LOI-R_002
2020_FR-RHO-S-R_002
2020_IT-CEN-CH-CL-R_001
2020_IT-CEN-W-V_007
2020_IT-SS-R-NA_004
2020_NW-CB_009
2020_NW-O-R-MAU_007
2020_NW-O-W-K_002
2020_NW-PIN-CHI-LEY_003
2020_NW-PIN-SAF_004
2020_NW-SAV-CHI-LEY_008
2020_NW-TOR_001
2020_OFS-L_000A
2020_PGL-VVE_008
2020_PGL-D-R_015
2020_ROS_034
2020_SPA-IT-P_002
2020_SPA-IT-P_011
2020_SPN-CAT-R_020
2020_SPN-DUE-R_041
2020_SPN-N-R_009
2020_SPN-NW-ALB_005
2020_SPN-RIO-CR-R_003
2020_SPN-RIO-GR-R_001
2020_SPN-RIO-W_012
2020_TUR-R-OKBO_003
			`.split("\n").map(line=>line.trim()).filter(Boolean)
			})

	
		}

	data.forEach((cat) => {
		cat.wines.forEach((name) => {
			for (let i = 0; i < wines.length; i++) {
				if (name == wines[i].flightcode)
					return addWine(wines[i], {
						theme: cat.theme,
						startDate: new Date('2020-03-13'),
						endDate: new Date('2021'),
						metadata: cat.metadata,
					});
			}
			kill(`Could not find "${name}"`);
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

function addWine(el, config: any = {}) {
	el.teamName = config.team || el.Team.split(',').pop().trim();

	el.teamName = 'Team 1';

	el.team = 'Team 1';
	el.Team = 'Team 1';

	el.eventName =
		config.theme || `[${el.CompetitionCode}] ${el.CompetitionCategoryName} (${el.teamName})`;

	el['Tasting Date'] = new Date().toISOString();

	let startDate =
		config.startDate ||
		new Date(el['Tasting Date'].replace(re.us2euDate, '$3-$2-$1T00:01:00.000Z')).toISOString() ||
		kill(el, 'start date');
	let endDate =
		config.endDate ||
		new Date(el['Tasting Date'].replace(re.us2euDate, '$3-$2-$1T23:59:00.000Z')).toISOString() ||
		kill(el, 'end date');

	output[el.eventName] = output[el.eventName] || {
		meta: {
			team: el.teamName || kill(el, 'team'),
			category:
				el.eventName ||
				`[${el.CompetitionCode}] ${el.CompetitionCategoryName}` ||
				el.CompetitionCategoryName ||
				kill(el, 'cocana'),
			flight: el.eventName || kill(el, 'evname'),
			metadata: config.metadata || collectionMetadataR1,
			start_date: startDate,

			end_date: endDate,
		},
		wines: [],
	};

	if (startDate < output[el.eventName].meta.start_date)
		output[el.eventName].meta.start_date = startDate;

	if (output[el.eventName].meta.end_date < endDate) output[el.eventName].meta.end_date = endDate;

	output[el.eventName].wines.push({
		country: el.CountryName || kill(el, 'cname'),
		name: el.flightcode || a.flightcode.push(el.WineNodeID) || kill(el, 'fcode'),
		region: el.appellation || '',
		vintage: el.vintage || kill(el, 'cintage'),
		price: +el.price || a.price.push(el.WineNodeID) || kill(el, 'price'),
		currency: 'GBP',
		notes: getNotes(el),
	});
}

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
			a.type[el.WineType] = a.type[el.WineType] || 1;
			a.type[el.WineType]++;

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
