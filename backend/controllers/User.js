const { User, Role, Friend } = require("../models");


// Function to register a new user
exports.signup = async (req, res) => {
    try {
        const {email, username, password} = req.body;
        // Add validation for required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                errors: {
                    ...((!username) && { username: 'Username is required' }),
                    ...((!email) && { email: 'Email is required' }),
                    ...((!password) && { password: 'Password is required' })
                }
            });
        }
        console.log("New user request!  Username: " + username);
        // Ensure that the username and email don't already exist
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "User e-mail already exists!"});
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: "Username already exists!"});
        }

        var userRole = await Role.findOne({"name": "User"});
        
        // Create the User role if it doesn't exist
        if (!userRole) {
            userRole = new Role({ name: "User" });
            await userRole.save();
            console.log("Created User role");
        }
        
        console.log(userRole);
        const newUser = new User({
            email, username, password, roles: [userRole._id]
        });

        await newUser.save().catch(function(err) {
            console.log(err);
        });

        // Check to see if the new user has an e-mail address associated with any
        // external friend requests
        const friendRequests = Friend.find({email: newUser.email});
        if (friendRequests && typeof friendRequests == Object) {
            (await friendRequests).forEach((friendRequest) => {
                
            });
        }

        res.status(201).json({ message: "User registered successfully", user: newUser });

    } catch (error) {
        console.error("Error registering customer", error);
        res.status(500).json({message: "Internal server error"});
    }
};


