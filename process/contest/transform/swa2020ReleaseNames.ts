import * as csv2json from 'csvtojson';
import {dump, kill, error} from '../../vendor/printit (use throwlog instead)';

(async () => {
	let importFile;

	importFile = './swaFinalResult.csv';

	let wines = await csv2json().fromFile(__dirname + '/' + importFile);

	let output = wines.map((w) => {
		return `
		UPDATE ntbl_prod_subject s
		SET 
			clean_key = s.name,
			name = "${w.winename.replace(/"/g, '""')}",
			producer = "${w.producer.replace(/"/g, '""')}"
		WHERE
			s.name = "${w.flightcode.replace(/"/g, '""')}"
		;
		`;
	});

	console.log(output.join('\n\n'));
})();
