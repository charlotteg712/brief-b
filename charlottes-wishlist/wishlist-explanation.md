# Charlotte's Wishlist – How it works

In this folder you can write down everything you want changed in the app, and add images to explain it.

## What is in this folder

- `charlottes-wishlist.txt` – write your wishes here.
- `images/` – put your images here (jpg, png, ...).

## How to add a wish

1. Open `charlottes-wishlist.txt` and write your wish under "YOUR WISHES".
   Only add things, please do not delete what is already there.
2. Want to add an image? Copy the image file into the `images` folder, then write its file name in your wish:

   ```
   Wish 1: Make the red cursor a bit smaller. (image: cursor-idea.png)
   ```

## How to send it to Henri (Terminal on the Mac)

Open the Terminal (Cmd+Space, type "Terminal", press Enter).

**1. Go to the project folder**

```bash
cd ~/Desktop/Charlotte-App
```

**2. Get the latest version first** (only needed before you start editing)

```bash
git pull
```

**3. After you changed the wishlist or added images, send your changes:**

```bash
git add charlottes-wishlist
```

```bash
git commit -m "Charlotte's wishlist update"
```

```bash
git pull
```

```bash
git push
```

Done! Henri can now see your wishes.

## If something goes wrong

- **"Please tell me who you are"** when committing: run these once, with your own name and e-mail, then repeat step 3.

  ```bash
  git config --global user.name "Charlotte"
  ```

  ```bash
  git config --global user.email "your-email@example.com"
  ```

- **"Authentication failed"** when pushing: sign in to GitHub with `gh auth login` (choose GitHub.com, HTTPS, and "Login with a web browser"), then try `git push` again.
- **"Repository not found"**: you have not accepted the invitation to the repository yet. Check your e-mail.
- **Anything else**: send Henri a screenshot of the Terminal.
