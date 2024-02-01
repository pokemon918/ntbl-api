# Backend Development Guidelines

## The Backend

We are using PHP as our main programming language and Lumen as our main framework. [Lumen](https://lumen.laravel.com/) is considered as a micro-framework of [Laravel](https://laravel.com/). Please keep in mind that Lumen works a little bit differently some places (e.g. Auth, Logging) and some Laravel features are not available in Lumen (or at least you need to manually include them through). If you are wondering if a Laravel feature is not working then maybe it's good time to look directly into Lumen's documentation. For the purposes of this guidelines, we'll be using Lumen and Laravel interchangeably.


## Structure

Listed below are key folders related to our app:

- `app/`: contains app codes and other related directories
    - `Exceptions/`: contains custom exception classes
    - `Helpers/`: this is where we add custom helper classes
    - `Http/`: contains the Controllers and Middleware directories
    		- `Controllers/`: this is where all app controllers are located 
    		- `Middleware/`: this is where all app middlewares are located
    - `Models/`: this is where Eloquent models are created and configured
    - `Providers/`: contains our app's [providers](https://laravel.com/docs/5.8/providers)
    - `Mail/`: contains custom mail classes
- `bootstrap/`: contains the app.php
- `config/`: contains app configurations, grouped by their nature
- `routes/`: contains our API's routes
- `test/`: unit tests

## Config

There are three main places for configuration. The `bootstrap/app.php`, `.env`, files and the `config/*` directory
- `bootstrap/app.php` - contains Laravel related config. This is where we usually register our providers and middlewares.
- `.env` - this is where we add enviroment and platform related config such as database, mail, logging etc
- `config/*` - this directory contains files that contains app config. Our app's config are divided into files and grouped depending on their functionality.
    - `app.php`: it contains config related to the general functionality of our app
    - `bugsnag.php`: it contains config related to Bugsnag
    - `database.php`: all database config are stored in this file
    - `filesystems.php`: this file contains config related to how our app stores and retrieves files
    - `globals.php`: contains global contants and functions
    - `logging.php`: contains logging config
    - `mail.php`: contains mail config
    - `regex.php`: contains all the regex used by our app (mostly by custom rules and validation)

## Routes
All our API's routes are located in `routes/web.php`. Inside our routes file, we group (not always the case) our routes based on their functionality and controller (Users, Events etc). Simply, add a new line under an existing route (much better if related routes are stacked on top of each other). Please keep in mind that routes requiring authentication must be placed inside the `auth` middleware group.

```
$router->group(['middleware' => 'auth'], function () use ($router) {
	#authenticate routes here...
}
```

## Controllers
Our app's controllers are located in `app/Http/Controllers` directory. When adding a controller, determine whether the main Model related to is a broad general class and then create a subclass out of it. A good example of this is the CollectionController. The Collection model is a broad class that can mean any collection. For instance, events are collection and therefore we've created an EventController which extends the CollectionController.

Another thing to note with our Controllers is that we've created a trait called RESTActions. RESTActions contains REST related functionality which is commonly used by most if not all of our controllers

## Model
Our app's models are located in `app/Models` directory. When adding a model, make sure that you declare the table name by adding this line `protected $table = 'table_name';` as we are following a pattern where we name our tables singular (e.g. user, collection, impression etc);

If a model has a table relation (usually through foreign keys), make sure to setup the relationship (one-to-one, one-to-many, many-to-many) of those models in all related files/models.

When adding a new model, make sure you add the Auditable trait to it. The Auditable trait is can be found at `app/Models/Auditable.php` and is responsible for capturing model events which ultimate leads to it, auditing all the database transactions that happens to that specific model.

If we need to add a delete functionality, instead of adding a custom one, we can utilize the built-in Laravel trait named `SoftDeletes;`

## Validation
When adding a new functionality or a route. Most likely, there is a validation of some sort to one or more fields. The thumb-rule that we follow since the beginning is "Before fetching, updating, creating or doing anything, we do validation first". In short, validation is almost always at the top of all our major API routes. When adding a validation, we must first look into the `app/Helpers/ValidationHelper` to see whether the validation that we want to add already exists. If not, then we might want to consider adding a new one in the ValidationHelper or in its own class depending if this validation is a generic (can be reused on other places) one or unique to its controller.

Some validation requires us to utilize the `Illuminate\Support\Facades\Validator` class. The Validator class works by evaluating an array of values against rules usually defined in the Model. Model rules can either be a built-in Laravel rule or a custom one. To see all available built-in rules, please see - https://laravel.com/docs/5.8/validation#available-validation-rules. If we want to add a custom rule, we simply register it in the `app/Providers/AppServiceProvider`. In fact, we already have some existing custom rules in there.

We also have an existing function named `checkValidatorForErrors` that handles the validator. Most if not all of our validation uses this function so please check it out. You can find it in `ValidationHelper` class and it also has an adapation/extension in the `app/Controllers/Controller` class.

## Migrations
When adding a new table or column, we add them through the [migrations](https://laravel.com/docs/5.8/migrations). Ex: `php artisan make:migration create_users_table`. After we're done setting up our table or column, we need to make sure that, 1) The rollback functionality is properly setup and working. 2) We create an audit table for our newly created table the function is called `DBHelper::createAuditTable` it might look something like `DBHelper::createAuditTable('rating');`. Behind the scenes, it creates an audit_table_name where all DB transactions are stored (Please note that the model related to this table needs to inherit from Auditable trait in order for this to work).

If you're only adding columns to your migration, instead of using `DBHelper::createAuditTable`, you must use `DBHelper::applyColumnsToAuditTable($table);` $table here is the `Blueprint $table`. Once you establish applying the new columns to the Audits table, you also need to be able to roll back the changes. To do this, you need to add `DBHelper::dropColumnsFromAuditTable($table);` in the down() method in the migration. Please see a full example below.

```
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddDummyColumnsToUsersTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('user', function (Blueprint $table) {
			$string = $table->string('dummy1', 64);
			$nullableString = $table->string('dummy2', 128)->nullable();
			$intWithOptions = $table
				->integer('dummy3')
				->unsigned()
				->unique()
				->default(null);

			$table->decimal('dummy4', 12, 9);
			$table->decimal('dummy5', 10);
			$table->decimal('dummy6');
			$table->enum('dummy7', ['easy', 'hard']);
			$table->string('dummy8');
			DBHelper::applyColumnsToAuditTable($table);
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('user', function (Blueprint $table) {
			$table->dropColumn('dummy1');
			$table->dropColumn('dummy2');
			$table->dropColumn('dummy3');
			$table->dropColumn('dummy4');
			$table->dropColumn('dummy5');
			$table->dropColumn('dummy6');
			$table->dropColumn('dummy7');
			$table->dropColumn('dummy8');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
``` 

NOTE: In order to use we need to import the DBHelper class. `use App\Helpers\DBHelper;`

##DB Queries
Most of our DB transactions are handled through our (Eloquent) Models. Please see - https://laravel.com/docs/5.8/eloquent for more details. For the most part, this is reliable and works fast so we want to utilize this as much as possible. This kind of pattern usually requires that we setup the relationships between our models for ease of use. 

Sometimes we need to access data that belongs to another model but is related to the current model we are working with. For this, we must take advantage of Laravel's "Eager Loading". What eager loading does, is it alleviates the N + 1 query problem. To put it simply, it shortens the amount of database transaction. For more info about eager loading. Please see - https://laravel.com/docs/5.8/eloquent-relationships#eager-loading

Example:

```
//Instead of doing this...
$book = App\Model\Book::find(1);
$author_id = $book->author_id;
$contacts = App\Model\Contact::find($author_id);

//You can do this instead...
$results = App\Book::with('author.contacts')->get();
$contacts = $results->contacts

//The first code requires 3 DB transtactions while the second gets all the data in one DB transtaction
```

There are exceptions to the rule though, once-in-while, we need to do implement advance or complex queries. For this instances, it is better to execute queries directly through the `Illuminate\Support\Facades\DB` instead of the model. Please see https://laravel.com/docs/5.8/database for more info. An example of this can be found in searchTeam (TeamController) and getTeacherData (EventController)

## Mail
To add a custom mail handler, create a class in the `app\Mail` directory and extend the `Illuminate\Mail\Mailable`. For more info please check - https://laravel.com/docs/5.8/mail Tip: Just follow the same pattern as the existing Mail class `ResetPassword`. Using this pattern, you're required to add an email template in `resources\views\emails`. There's an existing template for resetPassword that you can follow as well.

If you're looking for mail-related config, you can check `config\mail.php` and sometimes we also add config in the .env file so please check that one as well.


## Unit Test
Since our app is mostly dealing with API and REST functionality, we implemented our unit tests using Node.js. Our framework of choice is mocha and chai. You can find our unit tests in the `test` directory. In the `test` folder, you can find sub-directories where our unit tests are grouped together based on functionality (user, events etc.). 

When unit testing a route or API, we must be very comprehensive in our approach. As much as possible, we think all positive and negative scenarios and make unit tests out of them. This ensures that our API will run in a consistent manner. Of course this is not perfect as we might sometimes miss some things along the way but in general it will lessen the risk of failure in our web app.









