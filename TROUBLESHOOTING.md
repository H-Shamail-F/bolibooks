# 🔧 BoliBooks Troubleshooting Guide

## 🚀 ULTIMATE SOLUTION

**Run this PowerShell script to fix everything:**
```powershell
cd C:\Users\User\bolibooks
.\ULTIMATE_START.ps1
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Route not found" Error

**Symptoms:**
- Browser shows "Route not found" when accessing routes
- Application loads but navigation doesn't work

**Solutions:**
1. **Hard refresh browser** (Ctrl+F5 or Ctrl+Shift+R)
2. **Wait for React compilation** (up to 30 seconds after starting)
3. **Check server status:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000/api/health
4. **Clear browser cache and localStorage**

### Issue 2: Port Already in Use

**Symptoms:**
- "EADDRINUSE" error when starting servers
- Servers won't start

**Solutions:**
```powershell
# Kill all Node processes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Check which processes are using ports
netstat -ano | findstr ":3000\|:5000"
```

### Issue 3: React App Not Loading

**Symptoms:**
- Blank page or loading forever
- Console errors in browser

**Solutions:**
1. **Check if build folder exists (should NOT exist in development):**
   ```powershell
   cd frontend
   Remove-Item build -Recurse -Force -ErrorAction SilentlyContinue
   ```
2. **Verify package.json proxy:**
   ```json
   "proxy": "http://localhost:5000"
   ```
3. **Check browser console for JavaScript errors**

### Issue 4: Backend API Not Responding

**Symptoms:**
- 500 errors or timeouts
- Login fails
- "Network Error" in browser

**Solutions:**
1. **Check backend logs** in the terminal window
2. **Verify environment variables** in backend/.env:
   ```
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CLIENT_URL=http://localhost:3000
   ```
3. **Test backend directly:** http://localhost:5000/api/health

---

## 🧪 Manual Startup Process

If the ultimate script doesn't work, follow these steps manually:

### 1. Clean Up
```powershell
cd C:\Users\User\bolibooks
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
Remove-Item frontend\build -Recurse -Force -ErrorAction SilentlyContinue
```

### 2. Start Backend
```powershell
cd backend
node src/server.js
```
**Expected output:**
- "✅ Database connection established successfully"
- "🚀 BoliBooks API server running on port 5000"

### 3. Start Frontend (in new terminal)
```powershell
cd frontend
set BROWSER=none
npm start
```
**Expected output:**
- "Compiled successfully!"
- "Local: http://localhost:3000"

---

## 🔍 Diagnostic Commands

**Check server status:**
```powershell
# Check if servers are running
netstat -ano | findstr "LISTEN" | findstr ":3000\|:5000"

# Test backend health
Invoke-WebRequest "http://localhost:5000/api/health" -UseBasicParsing

# Test frontend
Invoke-WebRequest "http://localhost:3000" -UseBasicParsing
```

**Check Node processes:**
```powershell
Get-Process | Where-Object {$_.ProcessName -eq "node"}
```

---

## 💡 Best Practices

1. **Always start backend first**, then frontend
2. **Wait for "Compiled successfully!"** before testing frontend
3. **Use separate terminal windows** for each server
4. **Hard refresh browser** after making changes
5. **Check both server terminal windows** for error messages

---

## 🆘 If Nothing Works

1. **Restart your computer**
2. **Run the ULTIMATE_START.ps1 script again**
3. **Check Windows Firewall** isn't blocking ports 3000/5000
4. **Try different ports** by modifying .env files
5. **Check antivirus software** isn't interfering

---

## 📞 Support

If you're still having issues, provide these details:
- Error messages from both terminal windows
- Browser console errors
- Output of diagnostic commands above
- Screenshots of the issue
