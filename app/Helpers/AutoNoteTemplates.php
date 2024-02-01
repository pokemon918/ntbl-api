<?php
namespace App\Helpers;

class AutoNoteTemplates
{
	public static function templates()
	{
		$nlnl = "\n\n";
		$templates = [];

		/*
			No. 1
			The wine is *hazy* and has a *tawny* colour, tending towards *brown*. *Deposit is visible*. The nose is *intense* with pronounced *oak* aromas.
			It is a *medium-sweet* wine with *low* acidity and *high* tannin levels. A *fortified wine*, the alcohol level is *high*, with a *full body* and *pronounced* intensity of flavour.
			Flavours of *sultanas* and *preserved fruits* can be detected and the finish is *long*.
		*/

		$templates[] =
			'This wine is {{clarity_}} and has a colour tending towards {{nuance_}}. The nose is {{noseintensity_}} with pronounced {{nose_}} aromas. ' .
			$nlnl .
			'It is a {{sweetness_}} wine with {{acidity_}} acidity and {{tannins_}} tannin levels. The alcohol level is {{alcohol_}}, with a {{body_}} and {{palateintensity_}} intensity of flavour. ' .
			$nlnl .
			'Flavours of {{palate_}} can be detected and the finish is {{finish_}}.';

		/*
			No. 2
			A *clear* wine, the colour is an intense *medium gold*.  The nose is *developing*, with aromas of *grapefruit, lemon and mango*. 
			The wine is *medium* dry with *medium* acidity and no tannins. The alcohol level is *medium* to *medium(+)*. The body is *medium(+)*, as is the flavour intensity, with characteristics of *fruits* and *spices*. The finish is *medium(+)*.
		*/

		$templates[] =
			'A {{clarity_}} wine. The colour is {{colorintensity_}} {{nuance_}}. The nose is {{development_}}, with aromas of {{nose_}}. ' .
			$nlnl .
			'The wine is {{sweetness_}} with {{acidity_}} acidity and {{tannins_}} tannins. The alcohol level is {{alcohol_}}. The body is {{body_}}, as is the flavour intensity. There are flavours of {{palate_}}. The finish is {{finish_}}.';

		/*
			No. 3 - Good when nose and flavour is the sameish;
			A wine with a *pale* *lemon green* colour which is *clear*. It has a *clean* *light* and *youthful* nose, with primary *floral* aromas of *honeysuckle* and *elderflower* of *medium* intensity.
			This is a *dry* wine of *high* acidity and no tannins. The alcohol level is *medium* and the body is *light*. Flavour intensity is *medium* and the finish is *short*.
		*/

		$templates[] =
			'A wine with a {{colorintensity_}} {{nuance_}} colour that is {{clarity_}}. It has a {{condition_}} {{noseintensity_}} and {{development_}} nose, with aromas of {{nose_}} of {{noseintensity_}} intensity. ' .
			$nlnl .
			'This is a {{sweetness_}} wine with {{acidity_}} acidity and {{tannins_}} tannins. The alcohol level is {{alcohol_}} and the body is {{body_}}. Flavour intensity is {{palateintensity_}} and the finish is {{finish_}}.';

		/*
			No. 4 
			The wine appears *clear* and *bright* with a *purple* colour. *Legs/tears* can be observed in the glass. The nose is *clean*, with a *medium* intensity and is *developing*.
			Aroma characteristics of black fruits such as *blackcurrant* and *black cherry* can be detected. The wine is *dry*, with *medium* acidity and *medium* tannins.  Alcohol level is *medium*, as is the body. Regarding flavour intensity, it is *medium*, with a *medium* finish.
		*/

		$templates[] =
			'This wine appears {{clarity_}} and {{colorintensity_}} with a {{nuance_}} colour. The nose is {{condition_}}, with a {{noseintensity_}} intensity, and the wine is {{development_}}. ' .
			$nlnl .
			'Aroma characteristics of {{nose_}} can be detected. The wine is {{sweetness_}}, with {{acidity_}} acidity and {{tannins_}} tannins. Alcohol level is {{alcohol_}}, and the body is {{body_}}. Regarding flavour intensity, it is {{palateintensity_}}, and has a {{finish_}} finish. ';

		/*
			No. 5
			The wine is *clear* and a *pale* *lemon* colour, with *bubbles*. The nose is *clean* and *light*, with aromas of *fruits*.
			Here, we have a *dry* wine of *high* acidity and no tannins. The alcohol level is *medium* and the wine has a *light* body.
			The wine is *sparkling*, with a *light* flavour intensity and a *short* finish.
		*/

		$templates[] =
			'The wine is {{clarity_}} with a {{colorintensity_}} {{nuance_}} colour. The nose is {{condition_}} and {{noseintensity_}} intensity level. There are aromas of {{nose_}}. ' .
			$nlnl .
			'It is a {{sweetness_}} wine of {{acidity_}} acidity and {{tannins_}} tannins. The alcohol level is {{alcohol_}} and the wine has a {{body_}} body. ' .
			$nlnl .
			'The wine is {{category_}}, with a {{palateintensity_}} flavour intensity and a {{finish_}} finish.';

		/*
			No. 6
			Appearance is *bright* with a *salmon* colour of *medium* intensity. The nose is *clean* with a *medium* intensity and *spicy* aromas.
			The wine is *medium-dry* with *medium* acidity and no tannins. Alcohol level is *medium*, as is the body. Flavour intensity is *medium+*.
			The wine is well balanced and flavours of *pears* and *redcurrants* can be detected. The finish is *medium*.
		*/

		$templates[] =
			"This wine's appearance is {{clarity_}} with a {{nuance_}} colour of {{colorintensity_}}. The nose is {{condition_}} and the intensity is {{noseintensity_}} with aromas of {{nose_}}. " .
			$nlnl .
			'The wine is {{sweetness_}} with {{acidity_}} acidity and {{tannins_}} tannins. Alcohol level is {{alcohol_}}, as is the body. Flavour intensity is {{palateintensity_}}. ' .
			$nlnl .
			'The wine is well balanced with flavours of {{palate_}} can be detected. The finish is {{finish_}}. ';

		/*
			No. 7
			A *clear* wine of *light* intensity and  a *lemon-green* colour.  The nose is *clean*, with aromas of *fruits* and *flowers*. 
			It is *dry* with *high acidity* and no tannins. Alcohol level is *medium* and the body is *medium*. The flavour intensity is *medium*, with characteristics of *fruits* and *flowers*. The finish is *short*.
		*/

		$templates[] =
			'A {{clarity_}} wine of {{colorintensity_}} intensity and a {{nuance_}} colour. The nose is {{condition_}}, with aromas of {{nose_}}. ' .
			$nlnl .
			'It is {{sweetness_}} wine with {{acidity_}} acidity and {{tannins_}} tannins. Alcohol level is {{alcohol_}} and the body is {{body_}}. The flavour intensity is {{palateintensity_}}, and there are characteristics of {{palate_}}. The finish is {{finish_}}.';

		/*
			No. 8
			The wine is *clear*, with a *medium* *gold* colour. Legs are left on the glass. The nose is elegant and *spicy* and of *medium+* intensity. *Oak aromas* can also be detected.
			This is a *dry* wine of *medium* acidity and *no* tannins. The alcohol level is *high* and the body is *medium+*. It has a *medium+* intensity and the finish is *long*.
		*/

		$templates[] =
			'The wine is {{clarity_}}, with a {{colorintensity_}} {{nuance_}} colour. The nose is elegant and {{condition_}} with a {{noseintensity_}} intensity. Aromas of {{nose_}} can be detected. ' .
			$nlnl .
			'This is a {{sweetness_}} wine of {{acidity_}} acidity and {{tannins_}} tannins. The alcohol level is {{alcohol_}} and the body is {{body_}}. It has a {{palateintensity_}} intensity and the finish is {{finish_}}. ';

		/*
			No. 9 
			A bright *clear* wine with a deep *purple* colour. The nose is *clean*, with a *medium+* intensity and is *fully developed*. Aromas of *vegetables* and *oak* are present.
			On the palate, the wine is *medium dry*, with *high* acidity and *coarse* *medium* tannins. Alcohol level is *high* and the body is *full*. Flavour intensity is *pronounced*, with a *long* finish.
		*/

		$templates[] =
			'A {{colorintensity_}} {{clarity_}} wine with a deep {{nuance_}} colour. The nose is {{condition_}}, with a {{noseintensity_}} intensity. It is {{development_}} with aromas of {{nose_}} are present. ' .
			$nlnl .
			'On the palate, the wine is {{sweetness_}}, with a {{acidity_}} acidity and {{tannins_}} tannins. Alcohol level is {{alcohol_}} and the body is {{body_}}. Flavour intensity is {{palateintensity_}}, with a {{finish_}} finish. ';

		/*
			No. 10
			A *clear* wine with a *pale* *salmon* colour. The nose is *clean* and *medium*, with aromas of *fruits* and *spices*.
			This is a *medium dry* wine of *medium* acidity and *no* tannins. The alcohol level is *medium+* and the wine has a *light* body.
			The wine has a *light* flavour intensity and a *short* finish.
		*/

		$templates[] =
			'A {{clarity_}} wine with a {{colorintensity_}} {{nuance_}} colour. The nose is {{condition_}} and the intensity is {{noseintensity_}}. There is aromas of {{nose_}}. ' .
			$nlnl .
			'It is a {{sweetness_}} wine with {{acidity_}} acidity and {{tannins_}} tannins. The alcohol level is {{alcohol_}} and the wine has a {{body_}} body. ' .
			$nlnl .
			'The wine has {{palateintensity_}} flavour intensity and a {{finish_}} finish.';

		/*
			No. 11
			The wine appears *clear* and is of *medium* intensity with a *purple* colour. The nose is *clean* and intensity is *pronounced*, with *developing* *spicy* aromas.
			It is *medium-dry* on the palate, with *medium* acidity and *medium* tannins. The alcohol level is *medium*, as is the body. Flavour intensity is *medium+*, and flavours of *spices* and *oak* can be detected.
			This is a well balanced wine with a *medium* finish.
		*/

		$templates[] =
			'The wine appears {{clarity_}} and is of {{colorintensity_}} intensity with a {{nuance_}} colour. The nose is {{condition_}} and the intensity is {{noseintensity_}}, with {{development_}} aromas of {{nose_}}. ' .
			$nlnl .
			'It is {{sweetness_}} on the palate, with {{acidity_}} acidity and {{tannins_}} tannins. The alcohol level is {{alcohol_}}, as is the body. The intensity is {{palateintensity_}}, and flavours of {{palate_}} can be detected. ' .
			$nlnl .
			'This is a wine with a {{finish_}} finish.';

		/*
			No. 12
			The wine is *bright* in the glass and *light* in intensity with a *gold* colour. *Legs/tears* can be seen on the glass. It has a *clean* nose, with aromas of *fruits* and *flowers*. 
			It is *medium-dry* with *medium acidity* and no tannins. Alcohol level is *high* and the body is *medium+*. *Fruits* and *spices* can be detected. The flavour intensity is *high* and the finish is *medium+*.
		*/

		$templates[] =
			'The wine is {{clarity_}} in the glass and {{colorintensity_}} in intensity with a {{nuance_}} colour. It has a {{condition_}} nose, with aromas of {{nose_}}. ' .
			$nlnl .
			'It is {{sweetness_}} with {{acidity_}} acidity and has no tannins. Alcohol level is {{alcohol_}} and the body is {{body_}}. Aromas of {{palate_}} can be detected. The flavour intensity is {{palateintensity_}} and the finish is {{finish_}}.';

		/*
			No. 13
			This is a *clear* wine of *medium* intensity with a *deep* *ruby* colour. Legs are left on the glass. The nose is *pronounced* and contains characteristics of *vegetables*. The wine is *fully developed*.
			It is *medium dry* and of *medium* acidity with *medium+* tannins. The alcohol level is *high* and the body is *medium+*. Intensity is *medium+* and the finish is *long*.
		*/

		$templates[] =
			'This is a {{clarity_}} wine of {{colorintensity_}} intensity with a {{nuance_}} colour. The nose is {{condition_}} and contains characteristics of {{nose_}}. The wine is {{development_}}. ' .
			$nlnl .
			'It is {{sweetness_}} and has {{acidity_}} acidity with {{tannins_}} tannins. The alcohol level is {{alcohol_}} and the body is {{body_}}. Intensity is {{palateintensity_}} and the finish is {{finish_}}.';

		/*
			No. 14
			A bright *clear* wine of *pale* intensity and a *lemon-green* colour. The nose is *clean* and of *light* with aroma characteristics of *fruits* and *flowers*.
			On the palate, the wine is *dry*, with *high* acidity and *no* tannins.  Alcohol level is *medium* and it has a *light* body. The flavour intensity is *medium*, with hints of *fruits*. Finish is *short*.
		*/

		$templates[] =
			'A {{clarity_}} wine with {{colorintensity_}} intensity and a {{nuance_}} colour. The nose is {{condition_}} with {{noseintensity_}} intensity and aroma characteristics of {{nose_}}. ' .
			$nlnl .
			'On the palate, the wine is {{sweetness_}}, with {{acidity_}} acidity and {{tannins_}} tannins. Alcohol level is {{alcohol_}} and it has a {{body_}} body. The flavour intensity is {{palateintensity_}}, with hints of {{palate_}}. Finish is {{finish_}}.';

		/*
			No. 15
			This wine appears *clear* in the glass, with a *medium* *orange* colour. The nose is *clean* and *medium*, with aromas of *spices* and *vegetables*.
			It is a *medium dry* wine of *medium-* acidity and *no* tannins. Alcohol level is *medium+* and the wine has a *medium+* body.
			Flavour intensity is *medium+*, with hints of *spices*. The finish is *medium*.
		*/

		$templates[] =
			'This wine appears {{clarity_}} in the glass, with a {{colorintensity_}} {{nuance_}} colour. The nose is {{condition_}} and with {{noseintensity_}} intensity, it has aromas of {{nose_}}. ' .
			$nlnl .
			'It is a {{sweetness_}} wine with {{acidity_}} acidity and {{tannins_}} tannins. Alcohol level is {{alcohol_}} and the wine has a {{body_}} body. ' .
			$nlnl .
			'Flavour intensity is {{palateintensity_}}, with hints of {{palate_}}. The finish is {{finish_}}.';

		return $templates;
	}
}
