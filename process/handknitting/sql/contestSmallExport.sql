select 


-- /*
i.created_at,
t.name as team,
id.email, 
sub.name,
sub.producer,
sub.country,
sub.region,
sub.vintage,
sub.price,
sub.currency,
info.info as medal,
p.summary_personal as tasting_note


from
ntbl_prod_impression i
left join ntbl_prod_user u ON i.owner_ref = u.ref
left join ntbl_prod_team t ON i.team_id = t.id
left join ntbl_prod_identity id ON id.`user_id` = u.id 
   left join ntbl_prod_collection c on i.collection_id = c.id
   left join ntbl_prod_subject sub on sub.impression_id = i.id
   left join ntbl_prod_impression_info info on info.impression_id = i.id
     left join ntbl_prod_individual p on p.impression_id = i.id
     left join ntbl_prod_marked_impressions m on m.impression_id = i.id
     left join ntbl_prod_team_collection tc on tc.collection_id = c.id
     left join ntbl_prod_team contest_team on tc.team_id = contest_team.id



where 1
AND info.field = 'recommendation'
and i.origin_id !=0
AND contest_team.ref = 'escptx'


