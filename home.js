// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// WAREHOUSE HELPER FUNCTIONS
// =====================
async function updateWarehouseTables(eventType, likedUserId = null) {
  console.log('🔧 === WAREHOUSE UPDATE STARTED ===');
  console.log('Event Type:', eventType);
  console.log('Liked User ID:', likedUserId);
  console.log('Current User ID:', currentUserId);
  
  const today = new Date();
  const dateKey = parseInt(today.toISOString().slice(0, 10).replace(/-/g, ''));
  const fullDate = today.toISOString().slice(0, 10);
  
  console.log('📅 Date Key:', dateKey);
  console.log('📅 Full Date:', fullDate);
  
  try {
    // 1. Ensure date exists in dim_date
    console.log('\n--- Step 1: Updating dim_date ---');
    const { data: dateData, error: dateError } = await supabase
      .from('dim_date')
      .upsert({
        date_key: dateKey,
        full_date: fullDate,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day_of_month: today.getDate(),
        day_name: today.toLocaleDateString('en-US', { weekday: 'long' }),
        is_weekend: today.getDay() === 0 || today.getDay() === 6
      }, { onConflict: 'date_key' });
    
    if (dateError) {
      console.error("❌ Date dimension error:", dateError);
    } else {
      console.log('✅ dim_date updated successfully');
    }
    
    console.log('\n--- Checking Event Type ---');
    console.log('Is event type "like"?', eventType === 'like');
    
    if (eventType === 'like') {
      console.log('\n--- Step 2: Processing LIKE event ---');
      
      // 2. Update fact_daily_likes
      console.log('Fetching today\'s likes...');
      console.log('Query date range:', fullDate, 'to', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('liker_id')
        .gte('created_at', fullDate)
        .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      console.log('📊 Likes query result:');
      console.log('  - Data:', likesData);
      console.log('  - Count:', likesData?.length);
      console.log('  - Error:', likesError);
      
      if (likesError) {
        console.error('❌ Error fetching likes:', likesError);
      }
      
      const totalLikes = likesData?.length || 0;
      const uniqueUsers = new Set(likesData?.map(l => l.liker_id)).size;
      const avgLikes = uniqueUsers > 0 ? totalLikes / uniqueUsers : 0;
      
      console.log('📈 Calculated stats:');
      console.log('  - Total Likes:', totalLikes);
      console.log('  - Unique Users:', uniqueUsers);
      console.log('  - Avg Likes per User:', avgLikes);
      
      // Check if record exists
      console.log('\nChecking if fact_daily_likes record exists for today...');
      const { data: existingLikes, error: existingError } = await supabase
        .from('fact_daily_likes')
        .select('id')
        .eq('date_key', dateKey)
        .single();
      
      console.log('Existing record:', existingLikes);
      console.log('Existing error:', existingError);
      
      const recordToUpsert = {
        id: existingLikes?.id || crypto.randomUUID(),
        date_key: dateKey,
        total_likes_sent: totalLikes,
        unique_users_who_liked: uniqueUsers,
        avg_likes_per_user: avgLikes,
        created_at: new Date().toISOString()
      };
      
      console.log('\n📝 Upserting fact_daily_likes with data:', recordToUpsert);
      
      const { data: likesUpsertData, error: likesUpsertError } = await supabase
        .from('fact_daily_likes')
        .upsert(recordToUpsert, { onConflict: 'date_key' });
      
      console.log('Upsert result:');
      console.log('  - Data:', likesUpsertData);
      console.log('  - Error:', likesUpsertError);
      
      if (likesUpsertError) {
        console.error('❌ fact_daily_likes upsert FAILED:', likesUpsertError);
      } else {
        console.log('✅ fact_daily_likes updated successfully!');
      }
      
      // 3. Update fact_popular_hobbies if we have hobbies data
      console.log('\n--- Step 3: Processing hobbies ---');
      console.log('Liked User ID provided?', !!likedUserId);
      
      if (likedUserId) {
        console.log('Fetching current user profile for hobbies...');
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('hobbies')
          .eq('user_id', currentUserId)
          .single();
        
        console.log('User profile:', userProfile);
        console.log('Profile error:', profileError);
        console.log('Has hobbies?', !!userProfile?.hobbies);
        
        if (userProfile?.hobbies) {
          const hobbies = userProfile.hobbies.split(',').map(h => h.trim());
          console.log('Hobbies array:', hobbies);
          
          console.log('Fetching total users count...');
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('user_id');
          
          const totalUsers = allProfiles?.length || 1;
          console.log('Total users:', totalUsers);
          
          for (const hobby of hobbies) {
            console.log(`\n  Processing hobby: "${hobby}"`);
            
            const { data: hobbyUsers, error: hobbyError } = await supabase
              .from('profiles')
              .select('user_id')
              .ilike('hobbies', `%${hobby}%`);
            
            const usersWithHobby = hobbyUsers?.length || 0;
            const percentage = (usersWithHobby / totalUsers) * 100;
            
            console.log(`    Users with "${hobby}":`, usersWithHobby);
            console.log(`    Percentage:`, percentage);
            
            // Check if record exists
            const { data: existingHobby } = await supabase
              .from('fact_popular_hobbies')
              .select('id')
              .eq('date_key', dateKey)
              .eq('interest_name', hobby)
              .single();
            
            const hobbyRecord = {
              id: existingHobby?.id || crypto.randomUUID(),
              date_key: dateKey,
              interest_name: hobby,
              category_name: 'Hobby',
              total_users_with_interest: usersWithHobby,
              percentage_of_total_users: percentage,
              created_at: new Date().toISOString()
            };
            
            console.log(`    Upserting hobby record:`, hobbyRecord);
            
            const { data: hobbyUpsertData, error: hobbyUpsertError } = await supabase
              .from('fact_popular_hobbies')
              .upsert(hobbyRecord, { onConflict: 'date_key,interest_name' });
            
            console.log(`    Upsert result:`, { data: hobbyUpsertData, error: hobbyUpsertError });
            
            if (hobbyUpsertError) {
              console.error(`    ❌ Hobby "${hobby}" upsert FAILED:`, hobbyUpsertError);
            } else {
              console.log(`    ✅ Hobby "${hobby}" updated successfully!`);
            }
          }
        } else {
          console.log('⚠️ No hobbies found for current user');
        }
      } else {
        console.log('⚠️ No liked user ID provided, skipping hobbies');
      }
    } 
    else if (eventType === 'page_load') {
      console.log('\n--- Step 4: Processing PAGE_LOAD event ---');
      
      // 8. Update fact_daily_active_users
      console.log('Fetching likes from today...');
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('liker_id, liked_id')
        .gte('created_at', fullDate)
        .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      console.log('Likes data:', likesData?.length, 'records');
      if (likesError) console.error('Likes error:', likesError);
      
      console.log('Fetching matches from today...');
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .gte('created_at', fullDate)
        .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      console.log('Matches data:', matchesData?.length, 'records');
      if (matchesError) console.error('Matches error:', matchesError);
      
      const activeUserIds = new Set([
        ...(likesData?.map(l => l.liker_id) || []),
        ...(likesData?.map(l => l.liked_id) || []),
        ...(matchesData?.map(m => m.user1_id) || []),
        ...(matchesData?.map(m => m.user2_id) || [])
      ]);
      
      const totalActive = activeUserIds.size;
      console.log('Total active users:', totalActive);
      
      console.log('Fetching new users from today...');
      const { data: newUsersData, error: newUsersError } = await supabase
        .from('users')
        .select('id')
        .gte('created_at', fullDate)
        .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      console.log('New users:', newUsersData?.length);
      if (newUsersError) console.error('New users error:', newUsersError);
      
      const newUsers = newUsersData?.length || 0;
      const returningUsers = totalActive - newUsers;
      
      console.log('📊 Stats - Active:', totalActive, 'New:', newUsers, 'Returning:', returningUsers);
      
      // Check for existing record
      const { data: existingActive } = await supabase
        .from('fact_daily_active_users')
        .select('id')
        .eq('date_key', dateKey)
        .single();
      
      const activeUsersRecord = {
        id: existingActive?.id || crypto.randomUUID(),
        date_key: dateKey,
        total_active_users: totalActive,
        new_users: newUsers,
        returning_users: returningUsers,
        created_at: new Date().toISOString()
      };
      
      console.log('📝 Upserting fact_daily_active_users...');
      
      const { data: activeUpsertData, error: activeUpsertError } = await supabase
        .from('fact_daily_active_users')
        .upsert(activeUsersRecord, { onConflict: 'date_key' });
      
      if (activeUpsertError) {
        console.error('❌ fact_daily_active_users FAILED:', activeUpsertError);
      } else {
        console.log('✅ fact_daily_active_users updated!');
      }
      
      // 9. Update fact_gender_distribution
      console.log('\n--- Step 5: Processing GENDER DISTRIBUTION ---');
      
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('user_id, gender');
      
      console.log('All profiles:', allProfiles?.length);
      if (allProfilesError) console.error('Profiles error:', allProfilesError);
      
      if (allProfiles && allProfiles.length > 0) {
        const genders = [...new Set(allProfiles.map(p => p.gender).filter(Boolean))];
        console.log('Unique genders:', genders);
        
        for (const gender of genders) {
          console.log(`  Processing gender: "${gender}"`);
          
          const genderUserIds = allProfiles.filter(p => p.gender === gender).map(p => p.user_id);
          const totalUsers = genderUserIds.length;
          
          console.log(`    Total users: ${totalUsers}`);
          
          if (genderUserIds.length === 0) continue;
          
          const { data: genderLikes } = await supabase
            .from('likes')
            .select('liker_id')
            .in('liker_id', genderUserIds)
            .gte('created_at', fullDate)
            .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
          
          const totalLikes = genderLikes?.length || 0;
          const activeUsers = new Set(genderLikes?.map(l => l.liker_id)).size;
          
          const { data: genderMatches } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .or(`user1_id.in.(${genderUserIds.join(',')}),user2_id.in.(${genderUserIds.join(',')})`)
            .gte('created_at', fullDate)
            .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
          
          const totalMatches = genderMatches?.length || 0;
          const avgLikes = activeUsers > 0 ? totalLikes / activeUsers : 0;
          
          console.log(`    Likes: ${totalLikes}, Matches: ${totalMatches}, Active: ${activeUsers}`);
          
          const { data: existingGender } = await supabase
            .from('fact_gender_distribution')
            .select('id')
            .eq('date_key', dateKey)
            .eq('gender', gender)
            .single();
          
          const genderRecord = {
            id: existingGender?.id || crypto.randomUUID(),
            date_key: dateKey,
            gender: gender,
            total_users: totalUsers,
            active_users: activeUsers,
            total_likes_sent: totalLikes,
            total_matches: totalMatches,
            avg_likes_per_user: avgLikes,
            created_at: new Date().toISOString()
          };
          
          console.log(`    📝 Upserting...`);
          
          const { data: genderUpsertData, error: genderUpsertError } = await supabase
            .from('fact_gender_distribution')
            .upsert(genderRecord, { onConflict: 'date_key,gender' });
          
          if (genderUpsertError) {
            console.error(`    ❌ FAILED:`, genderUpsertError);
          } else {
            console.log(`    ✅ Gender "${gender}" updated!`);
          }
        }
      }
    }
    else if (eventType === 'match') {
      console.log('\n--- Step 6: Processing MATCH event ---');
      
      // Update fact_daily_matches
      console.log('Fetching matches from today...');
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .gte('created_at', fullDate)
        .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      console.log('Matches data:', matchesData?.length, 'records');
      if (matchesError) console.error('Matches error:', matchesError);
      
      const totalMatches = matchesData?.length || 0;
      const uniqueUsersMatched = new Set([
        ...(matchesData?.map(m => m.user1_id) || []),
        ...(matchesData?.map(m => m.user2_id) || [])
      ]).size;
      
      // Calculate match rate (matches / total likes) * 100
      const { data: likesData } = await supabase
        .from('likes')
        .select('id')
        .gte('created_at', fullDate)
        .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
      
      const totalLikes = likesData?.length || 0;
      const matchRate = totalLikes > 0 ? (totalMatches / totalLikes) * 100 : 0;
      
      console.log('📊 Match Stats - Total:', totalMatches, 'Unique Users:', uniqueUsersMatched, 'Match Rate:', matchRate + '%');
      
      // Check for existing record
      const { data: existingMatches } = await supabase
        .from('fact_daily_matches')
        .select('id')
        .eq('date_key', dateKey)
        .single();
      
      const matchesRecord = {
        id: existingMatches?.id || crypto.randomUUID(),
        date_key: dateKey,
        total_matches_created: totalMatches,
        unique_users_matched: uniqueUsersMatched,
        match_rate_percentage: matchRate,
        created_at: new Date().toISOString()
      };
      
      console.log('📝 Upserting fact_daily_matches...');
      const { error: matchesUpsertError } = await supabase
        .from('fact_daily_matches')
        .upsert(matchesRecord, { onConflict: 'date_key' });
      
      if (matchesUpsertError) {
        console.error('❌ fact_daily_matches FAILED:', matchesUpsertError);
      } else {
        console.log('✅ fact_daily_matches updated!');
      }
      
      // Update fact_matches_by_graduation_year
      console.log('\n--- Step 7: Processing MATCHES BY GRADUATION YEAR ---');
      
      if (matchesData && matchesData.length > 0) {
        // Get profiles with graduation years for matched users
        const allMatchedUserIds = [...new Set([
          ...matchesData.map(m => m.user1_id),
          ...matchesData.map(m => m.user2_id)
        ])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, graduation_year')
          .in('user_id', allMatchedUserIds);
        
        console.log('Profiles fetched:', profiles?.length);
        
        if (profiles && profiles.length > 0) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p.graduation_year]));
          const yearStats = new Map();
          
          // Calculate stats for each graduation year
          matchesData.forEach(match => {
            const year1 = profileMap.get(match.user1_id);
            const year2 = profileMap.get(match.user2_id);
            
            if (year1) {
              if (!yearStats.has(year1)) {
                yearStats.set(year1, { total: 0, sameYear: 0, diffYear: 0 });
              }
              const stats = yearStats.get(year1);
              stats.total++;
              if (year1 === year2) stats.sameYear++;
              else stats.diffYear++;
            }
            
            if (year2 && year2 !== year1) {
              if (!yearStats.has(year2)) {
                yearStats.set(year2, { total: 0, sameYear: 0, diffYear: 0 });
              }
              const stats = yearStats.get(year2);
              stats.total++;
              stats.diffYear++;
            }
          });
          
          // Upsert records for each graduation year
          for (const [year, stats] of yearStats.entries()) {
            console.log(`  Processing year: ${year}`);
            
            const { data: existingYear } = await supabase
              .from('fact_matches_by_graduation_year')
              .select('id')
              .eq('date_key', dateKey)
              .eq('graduation_year', year)
              .single();
            
            const yearRecord = {
              id: existingYear?.id || crypto.randomUUID(),
              date_key: dateKey,
              graduation_year: year,
              total_matches: stats.total,
              same_year_matches: stats.sameYear,
              different_year_matches: stats.diffYear,
              created_at: new Date().toISOString()
            };
            
            const { error: yearError } = await supabase
              .from('fact_matches_by_graduation_year')
              .upsert(yearRecord, { onConflict: 'date_key,graduation_year' });
            
            if (yearError) {
              console.error(`    ❌ Year ${year} FAILED:`, yearError);
            } else {
              console.log(`    ✅ Year ${year} updated!`);
            }
          }
        }
      }
      
      // Update fact_matches_by_location
      console.log('\n--- Step 8: Processing MATCHES BY LOCATION ---');
      
      if (matchesData && matchesData.length > 0) {
        const allMatchedUserIds = [...new Set([
          ...matchesData.map(m => m.user1_id),
          ...matchesData.map(m => m.user2_id)
        ])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, location_city, location_country')
          .in('user_id', allMatchedUserIds);
        
        console.log('Profiles fetched:', profiles?.length);
        
        if (profiles && profiles.length > 0) {
          const profileMap = new Map(profiles.map(p => [p.user_id, {
            city: p.location_city,
            country: p.location_country
          }]));
          
          const locationStats = new Map();
          
          matchesData.forEach(match => {
            const loc1 = profileMap.get(match.user1_id);
            const loc2 = profileMap.get(match.user2_id);
            
            if (loc1?.city && loc1?.country) {
              const locKey = `${loc1.city}|${loc1.country}`;
              if (!locationStats.has(locKey)) {
                locationStats.set(locKey, {
                  city: loc1.city,
                  country: loc1.country,
                  total: 0,
                  sameLocation: 0,
                  diffLocation: 0
                });
              }
              const stats = locationStats.get(locKey);
              stats.total++;
              if (loc1.city === loc2?.city && loc1.country === loc2?.country) {
                stats.sameLocation++;
              } else {
                stats.diffLocation++;
              }
            }
          });
          
          // Upsert records for each location
          for (const [locKey, stats] of locationStats.entries()) {
            console.log(`  Processing location: ${stats.city}, ${stats.country}`);
            
            const { data: existingLoc } = await supabase
              .from('fact_matches_by_location')
              .select('id')
              .eq('date_key', dateKey)
              .eq('location_city', stats.city)
              .eq('location_country', stats.country)
              .single();
            
            const locRecord = {
              id: existingLoc?.id || crypto.randomUUID(),
              date_key: dateKey,
              location_city: stats.city,
              location_country: stats.country,
              total_matches: stats.total,
              same_location_matches: stats.sameLocation,
              different_location_matches: stats.diffLocation,
              created_at: new Date().toISOString()
            };
            
            const { error: locError } = await supabase
              .from('fact_matches_by_location')
              .upsert(locRecord, { onConflict: 'date_key,location_city,location_country' });
            
            if (locError) {
              console.error(`    ❌ Location ${stats.city} FAILED:`, locError);
            } else {
              console.log(`    ✅ Location ${stats.city} updated!`);
            }
          }
        }
      }
      
      // Update fact_interest_match_success
      console.log('\n--- Step 9: Processing INTEREST MATCH SUCCESS ---');
      
      if (matchesData && matchesData.length > 0) {
        const allMatchedUserIds = [...new Set([
          ...matchesData.map(m => m.user1_id),
          ...matchesData.map(m => m.user2_id)
        ])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, hobbies')
          .in('user_id', allMatchedUserIds);
        
        if (profiles && profiles.length > 0) {
          const interestStats = new Map();
          
          // Collect all interests from matched users
          profiles.forEach(profile => {
            if (profile.hobbies) {
              const hobbies = profile.hobbies.split(',').map(h => h.trim());
              hobbies.forEach(hobby => {
                if (!interestStats.has(hobby)) {
                  interestStats.set(hobby, { users: new Set(), matchCount: 0 });
                }
                interestStats.get(hobby).users.add(profile.user_id);
              });
            }
          });
          
          // Count matches per interest
          const profileMap = new Map(profiles.map(p => [
            p.user_id, 
            p.hobbies ? p.hobbies.split(',').map(h => h.trim()) : []
          ]));
          
          matchesData.forEach(match => {
            const hobbies1 = profileMap.get(match.user1_id) || [];
            const hobbies2 = profileMap.get(match.user2_id) || [];
            const sharedHobbies = hobbies1.filter(h => hobbies2.includes(h));
            
            sharedHobbies.forEach(hobby => {
              if (interestStats.has(hobby)) {
                interestStats.get(hobby).matchCount++;
              }
            });
          });
          
          // Get total users with each interest
          const { data: allProfiles } = await supabase
            .from('profiles')
            .select('hobbies');
          
          // Upsert records for each interest
          for (const [interest, stats] of interestStats.entries()) {
            const totalWithInterest = allProfiles?.filter(p => 
              p.hobbies && p.hobbies.includes(interest)
            ).length || 0;
            
            const successRate = totalWithInterest > 0 
              ? (stats.matchCount / totalWithInterest) * 100 
              : 0;
            
            console.log(`  Processing interest: ${interest}`);
            
            const { data: existingInterest } = await supabase
              .from('fact_interest_match_success')
              .select('id')
              .eq('date_key', dateKey)
              .eq('interest_name', interest)
              .single();
            
            const interestRecord = {
              id: existingInterest?.id || crypto.randomUUID(),
              date_key: dateKey,
              interest_name: interest,
              category_name: 'Hobby',
              users_with_interest: totalWithInterest,
              matches_made: stats.matchCount,
              match_success_rate: successRate,
              created_at: new Date().toISOString()
            };
            
            const { error: interestError } = await supabase
              .from('fact_interest_match_success')
              .upsert(interestRecord, { onConflict: 'date_key,interest_name' });
            
            if (interestError) {
              console.error(`    ❌ Interest ${interest} FAILED:`, interestError);
            } else {
              console.log(`    ✅ Interest ${interest} updated!`);
            }
          }
        }
      }
    }
    else {
      console.log('⚠️ Unknown event type:', eventType);
    }
    
  } catch (err) {
    console.error("❌ === WAREHOUSE UPDATE ERROR ===", err);
  }
  
  console.log('🏁 === WAREHOUSE UPDATE COMPLETED ===\n');
}

// =====================
// ELEMENT REFERENCES
// =====================
const feed = document.getElementById("feed");
const userPanel = document.getElementById("userPanel");
const closePanel = document.getElementById("closePanel");

const panelName = document.getElementById("panelName");
const panelMainImg = document.getElementById("panelMainImg");
const userDetails = document.getElementById("userDetails");
const lookingFor = document.getElementById("lookingFor");

const likeBtn = document.getElementById("likeBtn");
const dislikeBtn = document.getElementById("dislikeBtn");
const matchBtn = document.getElementById("matchBtn");

const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");

// =====================
// GET CURRENT USER
// =====================
const currentUserId = localStorage.getItem('currentUserId');

if (!currentUserId) {
  alert("Please log in first!");
  window.location.href = "rizzalian.html";
}

// =====================
// STATE
// =====================
let users = [];
let currentIndex = 0;
let currentUser = null;

// =====================
// LOAD ALL PROFILES
// =====================
async function loadProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        users!inner(id, username)
      `)
      .neq('user_id', currentUserId); // Exclude current user

    if (error) {
      console.error("Error loading profiles:", error);
      return;
    }

    if (data && data.length > 0) {
      users = data;
      renderProfiles();
    } else {
      feed.innerHTML = "<p style='color: white; text-align: center;'>No profiles available yet.</p>";
    }

  } catch (err) {
    console.error("Load profiles error:", err);
  }
}

// =====================
// RENDER PROFILES
// =====================
function renderProfiles() {
  feed.innerHTML = "";
  
  users.forEach(user => {
    const card = document.createElement("div");
    card.classList.add("profile-card");
    
    const profileImage = user.profile_pic_url || "https://via.placeholder.com/300/cccccc/666666?text=No+Photo";
    const displayName = user.name || user.users.username || "Unknown";
    const displayAge = user.age || "?";
    const displayBio = user.bio || "No bio available";
    
    card.innerHTML = `
      <img src="${profileImage}" alt="Profile" class="profile-pic">
      <h2 class="name">${displayName}, ${displayAge}</h2>
      <p class="bio">${displayBio}</p>
    `;
    
    card.addEventListener("click", () => openPanel(user));
    feed.appendChild(card);
  });
  
  updateCarousel();
}

// =====================
// UPDATE CAROUSEL
// =====================
function updateCarousel() {
  const cardWidth = 260;
  const gap = 30;
  const scrollAmount = (cardWidth + gap) * currentIndex;
  feed.style.transform = `translateX(-${scrollAmount}px)`;
  
  updateArrows();
}

// =====================
// UPDATE ARROWS
// =====================
function updateArrows() {
  leftArrow.disabled = currentIndex === 0;
  rightArrow.disabled = currentIndex >= users.length - 1;
}

// =====================
// NAVIGATE LEFT
// =====================
leftArrow.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateCarousel();
  }
});

// =====================
// NAVIGATE RIGHT
// =====================
rightArrow.addEventListener("click", () => {
  if (currentIndex < users.length - 1) {
    currentIndex++;
    updateCarousel();
  }
});

// =====================
// OPEN PROFILE PANEL
// =====================
function openPanel(user) {
  currentUser = user;
  userPanel.classList.add("active");
  
  const displayName = user.name || user.users.username || "Unknown";
  const displayAge = user.age || "?";
  const profileImage = user.profile_pic_url || "https://via.placeholder.com/300/cccccc/666666?text=No+Photo";
  
  panelName.textContent = `${displayName}, ${displayAge}`;
  panelMainImg.src = profileImage;

  // Reset buttons
  matchBtn.style.display = "none";
  likeBtn.style.display = "block";
  dislikeBtn.style.display = "block";

  // Populate user details
  userDetails.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Birthday:</span>
      <span class="detail-value">${user.birthday || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Graduated Course:</span>
      <span class="detail-value">${user.graduated_course || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Graduation Year:</span>
      <span class="detail-value">${user.graduation_year || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Current Profession:</span>
      <span class="detail-value">${user.current_profession || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Gender:</span>
      <span class="detail-value">${user.gender || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Location:</span>
      <span class="detail-value">${user.location || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Height:</span>
      <span class="detail-value">${user.height || "N/A"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Hobbies:</span>
      <span class="detail-value">${user.hobbies || "N/A"}</span>
    </div>
  `;

  // Populate looking for
  lookingFor.textContent = user.looking_for || "No preference specified";
}

// =====================
// LIKE BUTTON
// =====================
likeBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  try {
    // Insert like into likes table
    const { error: likeError } = await supabase
      .from('likes')
      .insert([
        {
          liker_id: currentUserId,
          liked_id: currentUser.user_id
        }
      ]);

    if (likeError) {
      console.error("Like error:", likeError);
      alert("Error liking profile. You may have already liked this user.");
      return;
    }

    // Update warehouse for like event
    await updateWarehouseTables('like', currentUser.user_id);

    // Check if the other user already liked you (mutual like = match)
    const { data: mutualLike, error: mutualError } = await supabase
      .from('likes')
      .select('*')
      .eq('liker_id', currentUser.user_id)
      .eq('liked_id', currentUserId)
      .single();

    likeBtn.style.display = "none";
    dislikeBtn.style.display = "none";
    matchBtn.style.display = "block";

    if (mutualLike && !mutualError) {
      // It's a match! Create match record
      const user1 = currentUserId < currentUser.user_id ? currentUserId : currentUser.user_id;
      const user2 = currentUserId < currentUser.user_id ? currentUser.user_id : currentUserId;

      const { error: matchError } = await supabase
        .from('matches')
        .insert([
          {
            user1_id: user1,
            user2_id: user2
          }
        ]);

      if (matchError) {
        console.error("Match creation error:", matchError);
      }

      // Update warehouse for match event
      await updateWarehouseTables('match', currentUser.user_id);

      matchBtn.textContent = "It's a Match! 💚";
      matchBtn.classList.add("match");
      matchBtn.classList.remove("no-match");
    } else {
      // No match yet
      matchBtn.textContent = "Like Sent ❤️";
      matchBtn.classList.add("no-match");
      matchBtn.classList.remove("match");
    }

  } catch (err) {
    console.error("Like button error:", err);
    alert("An unexpected error occurred.");
  }
});

// =====================
// DISLIKE BUTTON
// =====================
dislikeBtn.addEventListener("click", () => {
  // Remove user from array (just hide them for this session)
  const userIndex = users.findIndex(u => u.user_id === currentUser.user_id);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
  }
  
  // Close panel
  userPanel.classList.remove("active");
  
  // Re-render profiles
  renderProfiles();
  
  // Adjust current index if needed
  if (currentIndex >= users.length && currentIndex > 0) {
    currentIndex--;
  }
  updateCarousel();
});

// =====================
// CLOSE PANEL
// =====================
closePanel.addEventListener("click", () => {
  userPanel.classList.remove("active");
});

// Close panel when clicking outside
userPanel.addEventListener("click", (e) => {
  if (e.target === userPanel) {
    userPanel.classList.remove("active");
  }
});

// =====================
// INITIALIZE
// =====================
loadProfiles();

// Update daily active users count on page load
updateWarehouseTables('page_load');