<?php
sleep(2);
header('Content-type: application/javascript');
?>
document.write('<scr' + 'ipt src="http://dev/docwrite/echo.php?t=<?php echo $_GET['t']; ?>"></scri' + 'pt>');