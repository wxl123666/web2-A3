-- =====================================================================
-- PROG2002 - Web Development II
-- Assessment 3 : Complete Dynamic Website - Hebei Charity Events
-- Student      : Xinliang Wang (24832805)
--
-- charityevents_db.sql - the COMPLETE database (schema + data)
--
-- Tables
--   charity_organisations   the charities running the events
--   event_categories        fun run, gala, walk, ...
--   events                  the events themselves
--   goals                   one fundraising goal per event
--   donations               money donated toward a goal (A2)
--   registrations           NEW IN A3 - who booked which event
--
-- The `registrations` table is the A3 addition:
--   * registration_id            PRIMARY KEY (the unique identifier)
--   * event_id                   FOREIGN KEY -> events(event_id), CASCADE
--   * full_name / email / phone  the user's contact details
--   * tickets                    how many places were booked (> 0)
--   * registration_date          DATETIME, defaults to "now"
--   * note                       optional message
--   * UNIQUE (event_id, email)   one person may register for many events,
--                                but only ONCE for the same event
--
-- 12 registrations were inserted to satisfy the "at least 10" rule.
-- Li Wei (li.wei@example.com) appears twice, on events 6 and 10, which
-- is the evidence that one person may attend more than one event.
--
-- How to restore:  mysql -u root -p charityevents_db < charityevents_db.sql
-- =====================================================================

-- MySQL dump 10.13  Distrib 9.7.1, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: charityevents_db
-- ------------------------------------------------------
-- Server version	9.7.1
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '13d963d3-76d3-11f1-9af2-c43d1aee4ed5:1-257';

--
-- Table structure for table `charity_organisations`
--

DROP TABLE IF EXISTS `charity_organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `charity_organisations` (
  `organisation_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `abn` varchar(20) DEFAULT NULL COMMENT 'Australian Business Number',
  `mission` varchar(255) NOT NULL,
  `about` text,
  `contact_email` varchar(120) NOT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `logo_emoji` varchar(16) NOT NULL DEFAULT 0xF09F929A,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`organisation_id`),
  UNIQUE KEY `uq_organisation_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `charity_organisations`
--

LOCK TABLES `charity_organisations` WRITE;
/*!40000 ALTER TABLE `charity_organisations` DISABLE KEYS */;
INSERT INTO `charity_organisations` (`organisation_id`, `name`, `abn`, `mission`, `about`, `contact_email`, `phone`, `website`, `logo_emoji`, `created_at`) VALUES (1,'Hebei Community Care','91130000MA0001HEBE','Neighbours helping neighbours across Hebei province.','Founded in 1998, Hebei Community Care delivers meals, emergency relief and winter heating support to more than 6,000 households every year across Shijiazhuang, Baoding and Handan.','hello@hebeicare.org.cn','+86 311 8800 1200','https://www.hebeicare.org.cn','🤝','2026-09-29 06:32:03'),(2,'Bohai Coast Guardians','91130000MA0002HEBE','Protecting the Bohai coastline, one clean-up at a time.','A volunteer-driven marine conservation charity running reef monitoring, turtle rescue and beach clean-up programs along the Bohai Sea from Qinhuangdao to Tangshan.','info@bohaiguardians.org.cn','+86 335 336 8800','https://www.bohaiguardians.org.cn','🌊','2026-09-29 06:32:03'),(3,'Hebei Children Future Foundation','91130000MA0003HEBE','Every child deserves a fair start at school.','The foundation funds scholarships, laptops and tutoring for students from low-income families across Hebei province, with a focus on mountain counties around Zhangjiakou and Chengde.','support@hebeichildren.org.cn','+86 311 8591 4400','https://www.hebeichildren.org.cn','🎒','2026-09-29 06:32:03'),(4,'Yanshan Health Research','91130000MA0004HEBE','Funding research that changes lives.','Yanshan Health Research raises money for medical research into childhood cancer, dementia and rare diseases at teaching hospitals in Shijiazhuang and Tangshan.','research@yanshanhealth.org.cn','+86 315 2679 0100','https://www.yanshanhealth.org.cn','🔬','2026-09-29 06:32:03'),(5,'Paws and Hearts Rescue','91130000MA0005HEBE','Rescue, rehabilitate, rehome.','A no-kill animal shelter serving Hebei province that rehomes more than 900 dogs and cats every year and runs a free desexing program for pets of families in crisis.','adopt@pawsandhearts.org.cn','+86 312 2522 7788','https://www.pawsandhearts.org.cn','🐾','2026-09-29 06:32:03');
/*!40000 ALTER TABLE `charity_organisations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donations`
--

DROP TABLE IF EXISTS `donations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donations` (
  `donation_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `donor_name` varchar(120) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `message` varchar(255) DEFAULT NULL,
  `donated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_anonymous` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`donation_id`),
  KEY `idx_donation_event` (`event_id`),
  CONSTRAINT `fk_donations_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_donation_amount` CHECK ((`amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donations`
--

LOCK TABLES `donations` WRITE;
/*!40000 ALTER TABLE `donations` DISABLE KEYS */;
INSERT INTO `donations` (`donation_id`, `event_id`, `donor_name`, `amount`, `message`, `donated_at`, `is_anonymous`) VALUES (1,1,'Sarah Mitchell',250.00,'Running for my mum. Good luck everyone!','2026-09-23 14:32:03',0),(2,1,'Coastal Runners Club',1500.00,'From our monthly sausage sizzle.','2026-09-24 14:32:03',0),(3,1,'Anonymous',120.00,NULL,'2026-09-25 14:32:03',1),(4,1,'Daniel Okafor',500.00,'First fun run - very excited!','2026-09-27 14:32:03',0),(5,1,'Broadbeach Bakery',800.00,'We will match every donation over $50.','2026-09-28 14:32:03',0),(6,2,'Priya Raman',100.00,'Thank you for looking after our beaches.','2026-09-20 14:32:03',0),(7,2,'Tweed Volunteers',2200.00,'Collection from our street stall.','2026-09-21 14:32:03',0),(8,2,'Anonymous',75.00,NULL,'2026-09-26 14:32:03',1),(9,3,'Harrison & Co Law',10000.00,'Proud to be the principal partner.','2026-09-17 14:32:03',0),(10,3,'Mei Lin',750.00,'Scholarships changed my life too.','2026-09-22 14:32:03',0),(11,3,'Anonymous',2500.00,NULL,'2026-09-24 14:32:03',1),(12,3,'Robina Rotary',5000.00,'Rotary is behind you all the way.','2026-09-27 14:32:03',0),(13,4,'Walkers United',4200.00,'Team total from 96 walkers.','2026-09-14 14:32:03',0),(14,4,'Grace Turner',150.00,'Walking in memory of Dad.','2026-09-19 14:32:03',0),(15,4,'Anonymous',640.00,NULL,'2026-09-25 14:32:03',1),(16,5,'Art Lovers GC',3200.00,'That Byron Bay house is ours!','2026-09-18 14:32:03',0),(17,5,'Chen Family',450.00,'For the rescue dogs.','2026-09-23 14:32:03',0),(18,6,'Live Music GC',6800.00,'Matching every ticket sold this week.','2026-09-15 14:32:03',0),(19,6,'Tom Bradley',180.00,'See you on the lawn.','2026-09-20 14:32:03',0),(20,6,'Anonymous',1100.00,NULL,'2026-09-26 14:32:03',1),(21,7,'Robina Markets',1800.00,'Stall fees donated in full.','2026-09-24 14:32:03',0),(22,7,'Winter Warmth Crew',950.00,'Coats and blankets drive.','2026-09-27 14:32:03',0),(23,8,'TechCorp Australia',5000.00,'Our engineers are mentoring on the day.','2026-09-21 14:32:03',0),(24,8,'Nadia Hussein',220.00,'My daughter cannot wait.','2026-09-23 14:32:03',0),(25,9,'Sunrise Yoga Studio',1400.00,'Mats and teachers donated.','2026-09-19 14:32:03',0),(26,9,'Anonymous',260.00,NULL,'2026-09-24 14:32:03',1),(27,10,'Dog Lovers GC',900.00,'From the Carrara dog park crew.','2026-09-22 14:32:03',0),(28,10,'Bella & Max',130.00,'Woof!','2026-09-25 14:32:03',0),(29,13,'Autumn Crew',6400.00,'Final total from the autumn clean-up.','2026-09-03 14:32:03',0),(30,13,'Kirra Surf Club',2100.00,'Great day for the coast.','2026-09-04 14:32:03',0),(31,14,'Ball Committee',48000.00,'Ticket sales from the 2026 ball.','2026-07-31 14:32:03',0),(32,14,'Gold Coast Rotary',25000.00,'Community partner contribution.','2026-08-02 14:32:03',0),(33,1,'Gold Coast City Council Grant',30000.00,'Community events grant 2026 round.','2026-09-26 14:32:03',0),(34,1,'Sunrise Media Partnership',15000.00,'Matched media sponsorship.','2026-09-27 14:32:03',0),(35,1,'Team Captains Total',9000.00,'Collected by 24 team captains.','2026-09-28 14:32:03',0),(36,2,'Coastal Care Trust',12000.00,'Matched giving for clean-ups.','2026-09-25 14:32:03',0),(37,3,'Harrison & Co Foundation',80000.00,'Principal partner pledge.','2026-09-25 14:32:03',0),(38,3,'Queensland Youth Orchestra',30000.00,'Donated proceeds from two concerts.','2026-09-26 14:32:03',0),(39,3,'Alumni Network',20000.00,'From 240 scholarship alumni.','2026-09-28 14:32:03',0),(40,4,'Night Walkers Alliance',48000.00,'Combined team fundraising.','2026-09-23 14:32:03',0),(41,4,'Children?s Hospital Auxiliary',30000.00,'Research grant top-up.','2026-09-27 14:32:03',0),(42,5,'Byron Bay Retreats',22000.00,'Proceeds of the auctioned holiday.','2026-09-26 14:32:03',0),(43,5,'Local Artists Collective',16000.00,'Donated artwork sales.','2026-09-27 14:32:03',0),(44,6,'Queensland Music Fund',40000.00,'Live music recovery grant.','2026-09-24 14:32:03',0),(45,6,'Parklands Events Trust',28000.00,'Venue contribution.','2026-09-27 14:32:03',0),(46,7,'Robina Town Centre',15000.00,'Centre management donation.','2026-09-25 14:32:03',0),(47,7,'Blanket Drive Partners',9000.00,'Matched coat and blanket drive.','2026-09-28 14:32:03',0),(48,8,'Innovation Hub Partners',14000.00,'Laptop and equipment donation.','2026-09-26 14:32:03',0),(49,8,'Parents & Citizens Assoc.',6000.00,'Fundraiser at the school fete.','2026-09-27 14:32:03',0),(50,9,'Wellbeing Collective',10000.00,'Matched wellbeing grant.','2026-09-25 14:32:03',0),(51,9,'Burleigh Caf?s Group',5000.00,'Breakfast supplied and donated.','2026-09-28 14:32:03',0),(52,10,'Pet Store Australia',12000.00,'Matched every entry fee.','2026-09-24 14:32:03',0),(53,10,'Gold Coast Vet Clinic',6000.00,'Free health checks on the day.','2026-09-27 14:32:03',0),(54,13,'Marine Debris Research Fund',10000.00,'Final matched gift.','2026-09-09 14:32:03',0),(55,14,'Scholarship Benefactors',90000.00,'Benefactor circle pledge.','2026-08-05 14:32:03',0),(56,14,'Black-Tie Auction Total',40000.00,'Auction proceeds on the night.','2026-08-10 14:32:03',0);
/*!40000 ALTER TABLE `donations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_categories`
--

DROP TABLE IF EXISTS `event_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(80) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `icon` varchar(16) NOT NULL DEFAULT 0xF09F8EAF,
  `image_url` varchar(255) DEFAULT NULL,
  `colour_hex` varchar(9) NOT NULL DEFAULT '#6366F1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_category_name` (`category_name`),
  UNIQUE KEY `uq_category_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_categories`
--

LOCK TABLES `event_categories` WRITE;
/*!40000 ALTER TABLE `event_categories` DISABLE KEYS */;
INSERT INTO `event_categories` (`category_id`, `category_name`, `slug`, `description`, `icon`, `image_url`, `colour_hex`, `created_at`) VALUES (1,'Fun Run','fun-run','Community walks, runs and marathons that raise funds per kilometre.','🏃','assets/img/sunrise-fun-run.jpg','#22D3EE','2026-09-29 06:32:03'),(2,'Gala Dinner','gala-dinner','Formal dinners with entertainment, auctions and guest speakers.','🥂','assets/img/gala-dinner.jpg','#A78BFA','2026-09-29 06:32:03'),(3,'Silent Auction','silent-auction','Bid on donated goods and experiences with all proceeds to charity.','🔨','assets/img/charity-auction.jpg','#F59E0B','2026-09-29 06:32:03'),(4,'Charity Concert','charity-concert','Live music events featuring local and national artists.','🎵','assets/img/sea-concert.jpg','#F472B6','2026-09-29 06:32:03'),(5,'Community Fete','community-fete','Family festivals with stalls, food trucks and kids activities.','🎪','assets/img/winter-fete.jpg','#34D399','2026-09-29 06:32:03'),(6,'Workshop','workshop','Hands-on classes and wellbeing sessions with a donation entry fee.','🧘','assets/img/morning-yoga.jpg','#60A5FA','2026-09-29 06:32:03');
/*!40000 ALTER TABLE `event_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `organisation_id` int NOT NULL,
  `category_id` int NOT NULL,
  `event_name` varchar(150) NOT NULL,
  `slug` varchar(160) NOT NULL,
  `summary` varchar(255) NOT NULL,
  `full_description` text NOT NULL,
  `event_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `venue` varchar(150) NOT NULL,
  `address` varchar(200) NOT NULL,
  `suburb` varchar(80) NOT NULL,
  `city` varchar(80) NOT NULL DEFAULT 'Gold Coast',
  `ticket_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_free` tinyint(1) NOT NULL DEFAULT '0',
  `goal_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `capacity` int NOT NULL DEFAULT '0',
  `seats_taken` int NOT NULL DEFAULT '0',
  `image_url` varchar(255) DEFAULT NULL,
  `cover_gradient` varchar(120) DEFAULT NULL COMMENT 'CSS gradient used as a fallback cover',
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','suspended') NOT NULL DEFAULT 'active' COMMENT 'Suspended events violate policy and are hidden from the website',
  `suspension_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uq_event_slug` (`slug`),
  KEY `idx_event_date` (`event_date`),
  KEY `idx_category` (`category_id`),
  KEY `idx_organisation` (`organisation_id`),
  KEY `idx_status_date` (`status`,`event_date`),
  CONSTRAINT `fk_events_category` FOREIGN KEY (`category_id`) REFERENCES `event_categories` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_events_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `charity_organisations` (`organisation_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_goal_amount` CHECK ((`goal_amount` >= 0)),
  CONSTRAINT `chk_ticket_price` CHECK ((`ticket_price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` (`event_id`, `organisation_id`, `category_id`, `event_name`, `slug`, `summary`, `full_description`, `event_date`, `end_date`, `venue`, `address`, `suburb`, `city`, `ticket_price`, `is_free`, `goal_amount`, `capacity`, `seats_taken`, `image_url`, `cover_gradient`, `featured`, `status`, `suspension_reason`, `created_at`, `updated_at`) VALUES (1,1,1,'Shijiazhuang Sunrise Fun Run','shijiazhuang-sunrise-fun-run','A 5 km beachfront run and 10 km challenge raising funds for emergency relief.','Join 3,000 runners on the sand at sunrise for the Hebei Sunrise Fun Run. Choose the 5 km community lap or the 10 km challenge, then stay for the finish-line festival with live music, a free breakfast barbecue and kids activities. Every dollar raised funds emergency food relief and crisis accommodation for Hebei families doing it tough.','2026-10-11 06:30:00','2026-10-11 11:00:00','Yutong Sports Centre','No. 1 Yutong Road','Shijiazhuang','Hebei',35.00,0,120000.00,3000,2412,'assets/img/sunrise-fun-run.jpg','linear-gradient(135deg,#0EA5E9,#22D3EE)',1,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37'),(2,2,5,'Bohai Beach Clean-Up Day','bohai-beach-clean-up-day','Volunteers clean 12 km of coastline and log every piece of rubbish collected.','Our flagship clean-up returns for its tenth year. Volunteers are deployed in teams across twelve kilometres of coastline from the Spit to Coolangatta. Gloves, bags, sunscreen and a barbecue lunch are provided. Marine biologists from the Coastal Research Lab join each team to log the debris collected, and the data feeds directly into the national marine debris database.','2026-10-05 08:00:00','2026-10-05 13:00:00','Laohushi Beach','Binhai Avenue','Qinhuangdao','Hebei',0.00,1,25000.00,800,611,'assets/img/beach-clean-up.jpg','linear-gradient(135deg,#0F766E,#34D399)',1,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37'),(3,3,2,'Stars of Tomorrow Gala Dinner','stars-of-tomorrow-gala-dinner','A three-course black-tie dinner funding 200 school scholarships for 2027.','An evening of fine dining, live entertainment and fundraising at the Star. The night includes a three-course menu, a performance by the Queensland Youth Orchestra, a silent auction of signed sporting memorabilia, and a keynote from a former scholarship student who is now a practising doctor. Proceeds fund 200 full scholarships for students from low-income families in 2027.','2026-10-23 18:30:00','2026-10-23 22:30:00','Wanda Vista Hotel','No. 88 Zhongshan Road','Shijiazhuang','Hebei',180.00,0,250000.00,420,357,'assets/img/gala-dinner.jpg','linear-gradient(135deg,#7C3AED,#A78BFA)',1,'active',NULL,'2026-09-29 06:32:03','2026-10-17 15:39:12'),(4,4,1,'Midnight Walk for Research','midnight-walk-for-research','A 20 km night walk through the city funding childhood cancer research.','Thousands of walkers set off at sunset and finish under the stars. The 20 km route loops the Broadwater, the Spit and Surfers Paradise, with illuminated rest stops, live bands and free massages along the way. Registration includes a commemorative head torch, a finishers medal and a hot breakfast at the finish line. All funds go to childhood cancer research at the local children\'s hospital.','2026-11-08 19:00:00','2026-11-09 02:00:00','Nanhu Park','Nanhu Avenue','Tangshan','Hebei',45.00,0,180000.00,2500,1721,'assets/img/midnight-walk.jpg','linear-gradient(135deg,#4338CA,#6366F1)',0,'active',NULL,'2026-09-29 06:32:03','2026-10-17 16:20:43'),(5,5,3,'Paws for a Cause Auction','paws-for-a-cause-auction','A silent auction of art, holidays and experiences for the animal shelter.','Bid online or in the room on more than 150 donated lots: original artworks by local painters, a week in a Byron Bay beach house, a private chef dinner for ten, signed jerseys and vintage wine. Every lot is displayed in the gallery for a week before the auction so you can inspect it. Funds cover a year of veterinary care for the animals in our shelter.','2026-10-17 17:00:00','2026-10-17 21:00:00','Baoding Museum','No. 1 Dongfeng Road','Baoding','Hebei',25.00,0,90000.00,300,217,'assets/img/charity-auction.jpg','linear-gradient(135deg,#B45309,#F59E0B)',1,'active',NULL,'2026-09-29 06:32:03','2026-10-17 15:39:12'),(6,2,4,'Songs for the Sea Concert','songs-for-the-sea-concert','An open-air concert with four acts supporting turtle rescue.','Pack a picnic and settle in on the lawn for an evening of music by the water. Four acts take the stage, headlined by Australian indie favourites, with all proceeds funding the turtle rescue and rehabilitation hospital. Gates open at five, the support acts start at six, and the fireworks close the night. Kids under twelve enter free.','2026-11-01 17:00:00','2026-11-01 22:00:00','Qinhuangdao Olympic Centre','Hebei Avenue West','Qinhuangdao','Hebei',65.00,0,150000.00,5000,3866,'assets/img/sea-concert.jpg','linear-gradient(135deg,#BE185D,#F472B6)',0,'active',NULL,'2026-09-29 06:32:03','2026-10-17 15:52:12'),(7,1,5,'Winter Warmth Community Fete','winter-warmth-community-fete','A family festival with 60 stalls raising money for winter homelessness support.','Sixty community stalls, food trucks from around the world, a petting zoo, face painting and a main stage programme of local dance and music groups. Bring a coat: every coat donated on the day goes straight to our winter homelessness program, and every dollar raised buys blankets, sleeping bags and warm meals for people sleeping rough on the Hebei.','2026-11-23 09:00:00','2026-11-23 16:00:00','Congtai Park','Congtai Road','Handan','Hebei',5.00,0,60000.00,4000,1533,'assets/img/winter-fete.jpg','linear-gradient(135deg,#047857,#10B981)',0,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37'),(8,3,6,'Tech for Teens Workshop','tech-for-teens-workshop','A weekend coding and robotics workshop, with laptops donated to participants.','Two days of hands-on workshops for students in years 7-10. Participants build and program a robot, publish a web page and learn the basics of cyber safety. Every participant who completes the weekend keeps the laptop they used. Volunteer mentors from local technology companies run each table, and lunch is provided on both days.','2026-10-08 09:00:00','2026-10-08 15:00:00','Langfang Maker Space','No. 6 Guangyang Road','Langfang','Hebei',15.00,0,45000.00,120,96,'assets/img/tech-workshop.jpg','linear-gradient(135deg,#1D4ED8,#60A5FA)',0,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37'),(9,4,6,'Mindful Mornings Yoga Session','mindful-mornings-yoga-session','A sunrise yoga and wellbeing session supporting mental health research.','Start the day with ninety minutes of guided vinyasa flow on the lawn, followed by a mindfulness workshop and a healthy breakfast prepared by volunteer chefs. All levels are welcome and mats are provided. Proceeds fund mental health research grants at the university clinic, and a counsellor is available after the session for anyone who would like to talk.','2026-10-03 06:30:00','2026-10-03 09:00:00','Chengde Mountain Resort','Lizhengmen Road','Chengde','Hebei',20.00,0,30000.00,150,118,'assets/img/morning-yoga.jpg','linear-gradient(135deg,#0E7490,#22D3EE)',0,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37'),(10,5,1,'Rescue Dog Dash 3 km','rescue-dog-dash-3km','Run or walk 3 km with your dog and help fund the shelter for a month.','Bring the dog, bring the family, and walk or run three kilometres along the river. There are water stations for dogs at every kilometre, a best-dressed competition, a rescue adoption tent and a free sausage sizzle. Every entry fee covers a month of food and veterinary care for one animal waiting for a home at the shelter.','2026-10-20 08:00:00','2026-10-20 11:00:00','Qingshuihe Riverside Park','Qingshuihe Road','Zhangjiakou','Hebei',20.00,0,40000.00,600,403,'assets/img/dog-dash.jpg','linear-gradient(135deg,#A16207,#FBBF24)',0,'active',NULL,'2026-09-29 06:32:03','2026-10-17 15:39:12'),(11,1,3,'VIP High-Roller Poker Night','vip-high-roller-poker-night','An invitation-only poker evening (SUSPENDED - gambling promotion).','This event was suspended because it promotes gambling, which breaches the fundraising policy of the organisation and the state fundraising guidelines. It is deliberately kept in the database so the suspension rule can be demonstrated: the website hides it, the API never returns it.','2026-10-14 19:00:00','2026-10-14 23:30:00','Private Venue','Address withheld','Shijiazhuang','Hebei',250.00,0,50000.00,80,0,'assets/img/gala-dinner.jpg','linear-gradient(135deg,#4B5563,#6B7280)',0,'suspended','Promotes gambling - breaches the organisation fundraising policy','2026-09-29 06:32:03','2026-09-29 09:39:37'),(12,4,4,'Warehouse Rave Fundraiser','warehouse-rave-fundraiser','An late-night warehouse party (SUSPENDED - no council approval).','This event was suspended because the venue had no council approval for a late-night licensed event and no responsible service of alcohol plan was lodged. It remains in the database for demonstration purposes and is filtered out of every public API response.','2026-10-10 21:00:00','2026-10-11 03:00:00','Industrial Warehouse','No. 12 Export Parade','Tangshan','Hebei',80.00,0,70000.00,700,0,'assets/img/sea-concert.jpg','linear-gradient(135deg,#4B5563,#6B7280)',0,'suspended','No council approval and no RSA plan lodged','2026-09-29 06:32:03','2026-09-29 09:39:37'),(13,2,5,'Autumn Coastline Clean-Up','autumn-coastline-clean-up','Our autumn clean-up collected 2.4 tonnes of debris from the coastline.','More than 700 volunteers joined our autumn clean-up and removed 2.4 tonnes of debris from the coastline, including 11,000 plastic bottles and 340 metres of discarded fishing line. The results were published in the national marine debris database and were used to brief the council on new recycling bins along the foreshore.','2026-09-01 08:00:00','2026-09-01 12:00:00','Beidaihe Beach','Beidaihe Coastal Road','Qinhuangdao','Hebei',0.00,1,20000.00,700,688,'assets/img/beach-clean-up.jpg','linear-gradient(135deg,#0F766E,#34D399)',0,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37'),(14,3,2,'Spring Scholarship Ball','spring-scholarship-ball','Last year\'s ball funded 150 scholarships for the 2026 school year.','The 2026 Spring Scholarship Ball brought together 380 guests and raised enough to fund 150 full scholarships for the school year, including laptops, textbooks and tutoring. Guests heard from three scholarship recipients who are now studying engineering, nursing and law.','2026-07-26 18:00:00','2026-07-26 23:00:00','Baoding Grand Hotel','No. 18 Chaoyang Street','Baoding','Hebei',165.00,0,220000.00,400,377,'assets/img/gala-dinner.jpg','linear-gradient(135deg,#7C3AED,#A78BFA)',0,'active',NULL,'2026-09-29 06:32:03','2026-09-29 09:39:37');
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goals`
--

DROP TABLE IF EXISTS `goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goals` (
  `goal_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `raised_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit_label` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dollars raised' COMMENT 'e.g. dollars raised, meals funded, trees planted',
  PRIMARY KEY (`goal_id`),
  UNIQUE KEY `uq_goals_event` (`event_id`),
  CONSTRAINT `fk_goals_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_goals_raised` CHECK ((`raised_amount` >= 0)),
  CONSTRAINT `ck_goals_target` CHECK ((`target_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goals`
--

LOCK TABLES `goals` WRITE;
/*!40000 ALTER TABLE `goals` DISABLE KEYS */;
INSERT INTO `goals` (`goal_id`, `event_id`, `title`, `target_amount`, `raised_amount`, `unit_label`) VALUES (1,1,'Fund 1,200 school-starter packs for Hebei children',120000.00,57170.00,'dollars raised'),(2,2,'Remove 4 tonnes of waste from Hebei beaches',25000.00,14375.00,'dollars raised'),(3,3,'Award 60 scholarships to students in need',250000.00,148250.00,'dollars raised'),(4,4,'Fund one year of paediatric research equipment',180000.00,82990.00,'dollars raised'),(5,5,'Rehome 400 rescue animals this year',90000.00,41650.00,'dollars raised'),(6,6,'Restore 8 hectares of seagrass meadow',150000.00,76080.00,'dollars raised'),(7,7,'Distribute 9,000 winter warmth packs',60000.00,26750.00,'dollars raised'),(8,8,'Give 150 teens a free coding scholarship',45000.00,25220.00,'dollars raised'),(9,9,'Subsidise 900 mental-health yoga classes',30000.00,16660.00,'dollars raised'),(10,10,'Cover vaccination and care for 200 rescue dogs',40000.00,19030.00,'dollars raised'),(11,11,'Fund 80 high-roller seats (event suspended)',50000.00,0.00,'dollars raised'),(12,12,'Fund 700 warehouse tickets (event suspended)',70000.00,0.00,'dollars raised'),(13,13,'Clear 3 kilometres of Kirra coastline',20000.00,18500.00,'dollars raised'),(14,14,'Fund 40 full university scholarships',220000.00,203000.00,'dollars raised');
/*!40000 ALTER TABLE `goals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registrations`
--

DROP TABLE IF EXISTS `registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `registration_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(160) NOT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `tickets` int NOT NULL DEFAULT '1',
  `registration_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `uq_registration_event_email` (`event_id`,`email`),
  CONSTRAINT `fk_registrations_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_registration_tickets` CHECK ((`tickets` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registrations`
--

LOCK TABLES `registrations` WRITE;
/*!40000 ALTER TABLE `registrations` DISABLE KEYS */;
INSERT INTO `registrations` (`registration_id`, `event_id`, `full_name`, `email`, `phone`, `tickets`, `registration_date`, `note`) VALUES (1,3,'Zhang Wei','zhang.wei@example.com','0311-8855-1021',2,'2026-10-02 09:14:00','Vegetarian meal please.'),(2,3,'Li Na','li.na@example.com','0311-8866-3344',4,'2026-10-04 20:02:00','Table near the stage.'),(3,3,'Wang Fang','wang.fang@example.com','0311-8877-5566',1,'2026-10-09 12:47:00',NULL),(4,3,'Chen Hao','chen.hao@example.com','0311-8899-7788',2,'2026-10-12 18:31:00','Bringing a colleague.'),(5,4,'Liu Yang','liu.yang@example.com','0315-2200-1188',3,'2026-10-05 07:55:00','Walking with my daughter.'),(6,4,'Zhao Min','zhao.min@example.com','0315-2211-2233',1,'2026-10-11 21:20:00',NULL),(7,4,'Sun Qiang','sun.qiang@example.com','0315-2233-4455',5,'2026-10-14 08:05:00','Team of five from the factory.'),(8,5,'Zhou Ling','zhou.ling@example.com','0335-6600-9001',2,'2026-10-06 16:40:00','Interested in the painting lot.'),(9,5,'Wu Jian','wu.jian@example.com','0335-6611-2345',1,'2026-10-13 10:12:00',NULL),(10,6,'Xu Mei','xu.mei@example.com','0310-3300-6789',4,'2026-10-07 13:26:00','Front standing tickets if possible.'),(11,6,'Li Wei','li.wei@example.com','0310-3311-1357',2,'2026-10-10 19:58:00',NULL),(12,10,'Li Wei','li.wei@example.com','0316-4400-2468',1,'2026-10-15 06:33:00','Running with my rescue dog.');
/*!40000 ALTER TABLE `registrations` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-18  0:21:05
