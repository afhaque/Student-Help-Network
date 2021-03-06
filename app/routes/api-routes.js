// *********************************************************************************
// api-routes.js - this file offers a set of routes for displaying and saving data to the db
// *********************************************************************************

// Dependencies
// =============================================================
var mongoose = require('mongoose');
var Student = require('../model/student.js');
var Mentor = require('../model/mentor.js');
var Professor = require('../model/professor.js');
var _ = require('lodash');
var nodemailer = require('nodemailer');
var passport = require('passport');

// Setting up the account that will send the emails.
var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'shn.noreply@gmail.com',
		pass: 'rutgers0451'
	}
});


// Routes
// =============================================================
module.exports = function(app){

	app.get('/api/section/:id', function(req, res) {
		Student.find({section: req.params.id}, function(err, students) {
			if (err) res.send(err);
			res.send(students);
		});
	});

	app.get('/testy', function(req, res) {
		Mentor.findOne({_id: '57b77203d0de5dbc343607ef'}).populate('mentoring').exec(function(err, mentor) {
			if (err) res.send(err);
			res.send(mentor)
			console.log(mentor)
		})
	});

	app.post('/api/ping', function(req, res) {
		console.log(req.user)
	})

	// Log in route.
	// app.post('/login', passport.authenticate('mentor', {failureRedirect: '/login',}), function(req, res) {
	// 	res.redirect('/api/mentors/' + req.user.id)
	// });
	app.post('/login', passport.authenticate('mentor', {failureRedirect: '/login',}), function(req, res) {
		Mentor.findOne({_id: req.user.id}).populate('mentoring').exec(function(err, mentor) {
			if (err) res.send(err);
			res.render('mentor', {user: mentor})
		})

		// res.render('mentor', {user: req.user})
	});

	// Log in route.
	app.post('/login-professor', passport.authenticate('professor', {failureRedirect: '/login',}), function(req, res) {
		Mentor.find({section: req.user.section, approved: null}, function(err, students) {
			if (err) res.send(err);
			res.render('professor', {user: req.user, pendingmentor: students})
		})
	});

	// Log out route.
	app.get('/logout',
  	function(req, res){
		req.logout();
    	res.redirect('/');
 	});


	// Approve
	app.post('/api/approve/:mentorid', function(req, res) {

		Mentor.findByIdAndUpdate(req.params.mentorid, { $set: { approved: true }}, function(err, mentor) {
			if (err) handleError(err);
			// console.log(req.user)
			console.log(req.user.name + " has successfully approved " + mentor.name + " as a mentor!");
			Mentor.find({section: req.user.section, approved: null}, function(err, students) {
				if (err) res.send(err);
				res.render('professor', {user: req.user, pendingmentor: students})
			})
		});

		// console.log("worked!")
		// Mentor.findById(req.params.mentorid, function(err, mentor) {
		// 	console.log("You are approving " + mentor.name)
		// })
	})

	// Deny
	app.post('/api/deny/:mentorid', function(req, res) {

		console.log(req.user)

		Mentor.findByIdAndUpdate(req.params.mentorid, { $set: { approved: false }}, function(err, mentor) {
			if (err) handleError(err);
			console.log(req.user.name + " has denied " + mentor.name + " as a mentor!");
			res.end();
		});
		// console.log("worked!")
		// Mentor.findById(req.params.mentorid, function(err, mentor) {
		// 	// console.log(mentor)
		// 	console.log("You are approving " + mentor.name)
		// })
	})




	// Returns a list of all students.
	app.get('/api/student-list', function(req,res) {

		Student.find({}).sort({date: -1}).exec(function(err, docs){
			if (err) {
	          	res.send(err);
	        } else {
	          	res.json(docs);
	        }
		});

	})

	// Professor Routes
	// =============================================================
	app.get('/api/professor/:id', function(req, res) {
		Student.find({section: req.params.id}, function(err, students) {
			if (err) res.send(err);
			res.json(students);
		})
	})

	app.get('/api/professor/pending/:id', function(req, res) {
		Mentor.find({section: req.params.id, approved: null}, function(err, students) {
			if (err) res.send(err);
			res.json(students);
		})
	})

	app.get('/api/professor/approved/:id', function(req, res) {
		Mentor.find({section: req.params.id, approved: true}, function(err, students) {
			if (err) res.send(err);
			res.json(students);
		})
	})

	// Route for getting information on a student.
	app.get('/api/students/:id', function(req, res) {
		Student.findById(req.params.id, function(err, student) {
			res.json(student);
		})
	})

	// Route for getting the information about a mentor.
	app.get('/api/mentors/:id', function(req, res) {
		Mentor.findById(req.params.id, function(err, mentor) {
			res.json(mentor);
		})
	})

	app.post('/student-signup', function(req, res) {

		// Creates a new Student based on the Mongoose schema and the post body
        var newStudent = new Student({
            name: req.body.name,
            email: req.body.email,
            section: req.body.section,
            comfortLevel: req.body.comfortLevel,
            subjects: req.body.subjects,
            availability: req.body.availability,
            additionalinfo: req.body.additionalinfo,

        });

        // New Student is saved in the db.
        newStudent.save(function(err){

        	console.log(req.body)

            if(err) res.send(err);

            //====

            // Search for a mentor with the same availability and atleast one subject in common.
			Mentor
			  .find({
			  	approved: true, 						// Mentor must be approved by their professor.
			  	availability: newStudent.availability, 	// Same availability.
			  	subjects: {$in: newStudent.subjects}		// At least one subject in common.
			  })
			  .sort({mentoring: 1}) 					// Sort by lest number of mentees first.
			  .exec(function(err, docs){

				if (err) res.send(err);

				// If we get results...
	          	if (docs.length != 0) {

	          		res.send(docs)
	          		console.log("You have been matched with " + docs[0])

	          		// Updating the database with the match.
	          		Mentor.findOneAndUpdate({'_id': docs[0]._id}, {$push:{"mentoring": newStudent._id}})
						.exec(function(err, artdoc){
							if (err){
								console.log(err);
							} else {
								console.log(artdoc);
								Student.findByIdAndUpdate(newStudent._id, { $set: { matched: true }}, function (err, student) {
								  	if (err) return handleError(err);
								});
							}
						});

	          	// If a match can't be found with availability & subjects...
	          	} else {

	          		// We will look for someone with just the same availability.
	          		Mentor.find({
	          			approved: true,
	          			availability: newStudent.availability
	          		})
	          		.sort({mentoring: 1})
	          		.exec(function(err, mentdocs) {

	          			if (err) res.send(err);

	          			// If we get results...
	          			if (mentdocs.length != 0) {

	          				res.send(mentdocs)
	          				console.log("You have been matched with " + mentdocs[0].name)

	          				// Updating the database with the match.
			          		Mentor.findOneAndUpdate({'_id': mentdocs[0]._id}, {$push:{"mentoring": newStudent._id}})
								.exec(function(err, artdoc){
									if (err){
										console.log(err);
									} else {
										console.log(artdoc);
										Student.findByIdAndUpdate(newStudent._id, { $set: { matched: true }}, function (err, student) {
										  	if (err) return handleError(err);
										});
									}
								});

	          			// If a match can't be found with the same availability...
	          			} else {

	          				console.log("REALLY? NO ONE?!")

	          				// We will look for a mentor that shares a subject.
	          				Mentor.find({
	          					approved: true,
	          					subjects: {$in: newStudent.subjects}
	          				})
	          				.sort({mentoring: 1})
	          				.exec(function(err, desperatedocs) {

	          					if (err) res.send(err);

	          					// If we get results...
	          					if (desperatedocs != 0) {

	          						res.send(desperatedocs)
	          						console.log("You have been matched with " + desperatedocs[0].name)

	          						// Updating the database with the match.
					          		Mentor.findOneAndUpdate({'_id': desperatedocs[0]._id}, {$push:{"mentoring": newStudent._id}})
										.exec(function(err, artdoc){
											if (err){
												console.log(err);
											} else {
												console.log(artdoc);
												Student.findByIdAndUpdate(newStudent._id, { $set: { matched: true }}, function (err, student) {
												  	if (err) return handleError(err);
												});
											}
										});

	          					// If a match can't be found...
	          					} else {

	          						console.log("...really?")

	          						// We just grab the first mentor we can!
	          						Mentor.find({
	          							approved: true
	          						})
	          						.sort({mentoring: 1})
	          						.exec(function(err, destitutedocs) {

	          							if (err) res.send(err);
	          							res.send(destitutedocs);
	          							console.log("You have been matched with " + destitutedocs[0].name + ". May god have mercy on your soul.")

	          							// Updating the database with the match.
						          		Mentor.findOneAndUpdate({'_id': destitutedocs[0]._id}, {$push:{"mentoring": newStudent._id}})
											.exec(function(err, artdoc){
												if (err){
													console.log(err);
												} else {
													console.log(artdoc);
													Student.findByIdAndUpdate(newStudent._id, { $set: { matched: true }}, function (err, student) {
													  	if (err) return handleError(err);
													});
												}
											});

	          						})

	          					}

	          				})

	          			}

	          		})

	          	}
		          	
			});

            //====
			
		});


	})

	// Creates a new student. **OLD WAY**
	app.post('/old-student-signup', function(req, res){
		console.log(req.body)

		// Creates a new Student based on the Mongoose schema and the post body
        var newStudent = new Student({
            name: req.body.name,
            email: req.body.email,
            section: req.body.section,
            comfortLevel: req.body.comfortLevel,
            subjects: req.body.subjects,
            availability: req.body.availability,
            additionalinfo: req.body.additionalinfo,

        });

        // New Student is saved in the db.
        newStudent.save(function(err){
            if(err) res.send(err);

		Mentor
		  .find({
		  	full: false,
		  	approved: true, 
		  	// availability: req.body.availability, 
		  	subjects: {$in: newStudent.subjects}
		  })
		  // .sort({date: -1})
		  .exec(function(err, docs){

				if (err) {
		          	res.send(err);
		        } else {

		          	if (docs.length != 0) {
		          		// console.log(docs)
		          		res.send(docs)

		          		var bestMatch;
		          		var highestNumber = 0;

		          		for (var i = 0; i < docs.length; i++) {
		          			var subjectsInCommon = _.intersection(newStudent.subjects, docs[i].subjects).length
		          			console.log( "You have " + subjectsInCommon + " subjects in common with " + docs[i].name );
		          			if (subjectsInCommon > highestNumber) {
		          				bestMatch = docs[i];
		          				highestNumber = subjectsInCommon;
		          			}
		          		}

		          		console.log("You have the most subjects in common with: " + bestMatch.name)
		          		console.log("You have " + highestNumber + " subjects in common with " + bestMatch.name)

		          		Mentor.findOneAndUpdate({'_id': bestMatch._id}, {$push:{"mentoring": newStudent._id}})
							.exec(function(err, artdoc){
								if (err){
									console.log(err);
								} else {
									console.log(artdoc);

									Student.findByIdAndUpdate(newStudent._id, { $set: { matched: true }}, function (err, student) {
									  	if (err) return handleError(err);
									  	// res.send(tank);
									});

								}
							});

		          	} else {
		          		// console.log("No matches found :(")
		          		res.send("No Matches found :(")
		          	}
		          	
		        }

			});

            // If no errors are found, it responds with a JSON of the new student
            // res.json(req.body);
        });

		// res.send("Thanks for signing up!")
	});

	// Route for creating a new mentor.
	app.post('/mentor-signup', function(req, res){

		console.log(req.body);

		// Creates a new mentor based on the Mongoose schema and the post body
        var newMentor = new Mentor({
            name: req.body.name,
            email: req.body.email,
            section: req.body.section,
            username: req.body.username,
            password: req.body.password,
            comfortLevel: req.body.comfortLevel,
            subjects: req.body.subjects,
            numCanMentor: req.body.numCanMentor,
            availability: req.body.availability,
        });

        // The new mentor is saved in the db.
       	newMentor.save(function(err){
            if(err) res.send(err);
            res.send("Thank You for signing up!")

            // Finding the professor of the mentor and sending them an email.
            Professor.findOne({section: newMentor.section}, function(err, prof) {
            	if (err) throw err;
            	console.log(prof);
            	console.log("You are in section: " + newMentor.section + ". Your Professor is " + prof.name + ". His email is " + prof.email + ".");

            			// Email options.
						var mailOptions = {
						    from: '"Student Help Network" <shn.noreply@gmail.com>', // sender address
						    // to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
						    to: prof.email,
						    subject: 'New Mentor Request', // Subject line
						    // text: 'One of your students' + newMentor.name + 'is requesting to be a mentor. Log in to accept or deny them.', // plaintext body
						    html: '<p>One of your students ' + newMentor.name + ' is requesting to be a mentor.</p> <p>Log in to accept or deny them.</p> <a href="http://google.com">link will be here!</a>' // html body
						};

						// Send mail with defined transport object.
						transporter.sendMail(mailOptions, function(error, info){
						    if(error){
						        return console.log(error);
						    }
						    console.log('Message sent: ' + info.response);
						    // res.send("Email sent successfully!")
						});
				            })
				        });
	});

	app.post('/api/mentors/', function(req, res) {
		console.log('hi!')
		console.log(req.body)
		console.log(req.params)
		console.log(req.params.num)
		// Mentor.find({availability: req.params.availability}).exec(function(err, mentors) {
		// 	if (err) res.send(err);
		// 	res.send(mentors);
		// })
		res.end();
	})

	app.post('/api/match-test', function(req, res) {

		// console.log(req.body);
		console.log(req.body.subjects)
		console.log(req.body.availability)
		console.log(req.body.approved)

		// Search for a mentor with the same availability and atleast one subject in common.
		Mentor
		  .find({
		  	approved: true, 						// Mentor must be approved by their professor.
		  	availability: req.body.availability, 	// Same availability.
		  	subjects: {$in: req.body.subjects}		// At least one subject in common.
		  })
		  .sort({mentoring: 1}) 					// Sort by lest number of mentees first.
		  .exec(function(err, docs){

				if (err) res.send(err);

				// If we get results...
	          	if (docs.length != 0) {

	          		res.send(docs)
	          		console.log("You have been matched with " + docs[0])

	          	// If a match can't be found with availability & subjects...
	          	} else {

	          		// We will look for someone with just the same availability.
	          		Mentor.find({
	          			approved: true,
	          			availability: req.body.availability
	          		})
	          		.sort({mentoring: 1})
	          		.exec(function(err, mentdocs) {

	          			if (err) res.send(err);

	          			// If we get results...
	          			if (mentdocs.length != 0) {

	          				res.send(mentdocs)
	          				console.log("You have been matched with " + mentdocs[0].name)

	          			// If a match can't be found with the same availability...
	          			} else {

	          				console.log("REALLY? NO ONE?!")

	          				// We will look for a mentor that shares a subject.
	          				Mentor.find({
	          					approved: true,
	          					subjects: {$in: req.body.subjects}
	          				})
	          				.sort({mentoring: 1})
	          				.exec(function(err, desperatedocs) {

	          					if (err) res.send(err);

	          					// If we get results...
	          					if (desperatedocs != 0) {

	          						res.send(desperatedocs)
	          						console.log("You have been matched with " + desperatedocs[0].name)

	          					// If a match can't be found...
	          					} else {

	          						console.log("...really?")

	          						// We just grab the first mentor we can!
	          						Mentor.find({
	          							approved: true
	          						})
	          						.sort({mentoring: 1})
	          						.exec(function(err, destitutedocs) {
	          							if (err) res.send(err);
	          							res.send(destitutedocs);
	          							console.log("You have been matched with " + destitutedocs[0].name + ". May god have mercy on your soul.")
	          						})

	          					}

	          				})

	          			}

	          		})

	          	}
		          	
			});

	});

	app.post('/api/newmatch-test', function(req, res) {

		// console.log(req.body);
		console.log(req.body.subjects)

		var query = Mentor.find({full: false, subjects: {$in: req.body.subjects} });

		Mentor
		  .find({
		  	full: false, 
		  	// availability: req.body.availability, 
		  	subjects: {$in: req.body.subjects}
		  })
		  .exec(function(err, docs){

		  	

				if (err) {
		          	res.send(err);
		        } else {

		          	if (docs.length != 0) {
		          		// console.log(docs)
		          		res.send(docs)

		          		var bestMatch;
		          		var highestNumber = 0;

		          		for (var i = 0; i < docs.length; i++) {
		          			var subjectsInCommon = _.intersection(req.body.subjects, docs[i].subjects).length
		          			console.log( "You have " + subjectsInCommon + " subjects in common with " + docs[i].name );
		          			if (subjectsInCommon > highestNumber) {
		          				bestMatch = docs[i];
		          				highestNumber = subjectsInCommon;
		          			}
		          		}

		          		console.log("You have the most subjects in common with: " + bestMatch.name)
		          		console.log("You have " + highestNumber + " subjects in common with " + bestMatch.name)

		          	} else {
		          		// console.log("No matches found :(")
		          		res.send("No Matches found :(")
		          	}
		          	
		        }

			});

	});

	// Create a new professor.
	app.post('/new-professor', function(req, res) {

		// Creates a new professor based on the Mongoose schema and the post body.
		var newProfessor = new Professor({
            name: req.body.name,
            email: req.body.email,
            section: req.body.section,
            username: req.body.username,
            password: req.body.password
        });

		// The new professor is saved in the db.
       	newProfessor.save(function(err){
            if(err) res.send(err);
            res.send("Thank You for signing up!");
        });

	});

	app.post('/approve', function(req, res) {

		Mentor.findByIdAndUpdate('57c0a5805d5ae1640f98c784', { $set: { approved: true }}, function(err, mentor) {
			if (err) handleError(err);
			res.send("Mentor Approved!")
		});

	});

	app.post('/email-test', function(req, res) {

		// console.log(req.body)

		// setup e-mail data with unicode symbols
		var mailOptions = {
		    from: '"Student Help Network" <shn.noreply@gmail.com>', // sender address
		    // to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
		    to: req.body.address,
		    subject: 'Test!', // Subject line
		    text: 'This is a test!', // plaintext body
		    html: '<b>Hello world 🐴</b>' // html body
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
		    if(error){
		        return console.log(error);
		    }
		    console.log('Message sent: ' + info.response);
		    res.send("Email sent successfully!")
		});

	})

}