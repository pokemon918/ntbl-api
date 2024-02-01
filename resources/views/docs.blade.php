@extends('layouts.app')
@section('title', 'Docs')
<link href="https://fonts.googleapis.com/css?family=Lato:300,400,700" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Abel" rel="stylesheet">
<style>
		
	body{
		margin:0;
	}
	
	.container{
		width: 1170px;
		max-width: 100%;
		margin:0 auto;
	}

	.docs-page{
		font-family: 'Lato', monospace;
		font-weight:300;
	}

	.docs-page .page-title{
		margin:0;
		padding:20px 20px 0px;
		color: #e67575;
		font-size: 3em;
	}

	.docs-page .docs-content{
		padding:20px;
	}

	.docs-page .route-collection{
		background:#efefef;
		padding:15px;
		-webkit-box-sizing: border-box;
		   -moz-box-sizing: border-box;
		        box-sizing: border-box;
		margin-bottom: 25px;
		-webkit-border-radius: 7px;
		        border-radius: 7px;
	}

	.docs-page h1,.docs-page h2, 
	.docs-page h3,.docs-page h4, 
	.docs-page h5,.docs-page h6 {
		font-family: 'Abel', sans-serif;
		font-weight:700;		
	}
	
	.docs-page .collection-name{
		margin: 0;
		font-size: 20px;
	}

	.docs-page .action{
		font-family: 'Abel', sans-serif;
	}

	.docs-page .method{
		padding-left: 20px;
		color: #e67575;
		font-weight: bold;
	}

</style>

@section('content')
<div class="docs-page">
	<h1 class="page-title">API Routes</h1>
	
	<div class="docs-content">
		@foreach ($apiDictionary as $routeCollection)
			<div class="route-collection">
				<h4 class="collection-name">{{$routeCollection['name']}}</h4>
					<ul>
					@foreach ($routeCollection['routes'] as $route)
			  		<li>
			  			<p><span class="uri">{{$route['uri']}}</span> - <span class="action">{{$route['action']}}</span></p>
			  			<p><span class="method">{{$route['method']}}</span> - <span class="description">{{$route['description']}}</span></p>
			  		</li>
			  	@endforeach
			  	</ul>
			</div>
		@endforeach
	</div>
	
</div>
@endsection
